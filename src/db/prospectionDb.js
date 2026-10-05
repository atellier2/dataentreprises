const DB_NAME = 'prospection'
const DB_VERSION = 2
const BASES = 'bases'
const ENTREPRISES = 'entreprises'
const NOTES = 'notes'

let dbPromise = null

function openDb() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION)
      req.onupgradeneeded = () => {
        const db = req.result
        // v1 had a single global pool of fiches with no notion of base (and
        // personal tags/notes stored inside them): purged on purpose.
        if (db.objectStoreNames.contains(ENTREPRISES)) db.deleteObjectStore(ENTREPRISES)
        // One fiche per siren, whatever the number of bases it belongs to:
        // `bases` holds the ids of those bases, indexed so "every fiche of
        // base X" is a direct lookup.
        const entreprises = db.createObjectStore(ENTREPRISES, { keyPath: 'siren' })
        entreprises.createIndex('bases', 'bases', { multiEntry: true })
        if (!db.objectStoreNames.contains(BASES)) db.createObjectStore(BASES, { keyPath: 'id' })
        // Notes hang off a siren, not off a base, and live in their own store
        // so re-downloading a fiche can never overwrite them.
        if (!db.objectStoreNames.contains(NOTES)) db.createObjectStore(NOTES, { keyPath: 'siren' })
      }
      req.onsuccess = () => resolve(req.result)
      req.onerror = () => reject(req.error)
    })
  }
  return dbPromise
}

// Runs `work(tx)` and resolves with its return value once the transaction has
// committed. `work` must only issue requests through callbacks (no awaiting
// inside) so the transaction doesn't auto-commit early.
async function run(storeNames, mode, work) {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeNames, mode)
    let result
    tx.oncomplete = () => resolve(result)
    tx.onerror = () => reject(tx.error)
    tx.onabort = () => reject(tx.error)
    result = work(tx)
  })
}

function request(req) {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

function detachFromBase(cursor, baseId) {
  const company = cursor.value
  const remaining = company.bases.filter(id => id !== baseId)
  if (remaining.length) cursor.update({ ...company, bases: remaining })
  else cursor.delete()
}

// ---------------------------------------------------------------- bases ----

export async function listBases() {
  const db = await openDb()
  return request(db.transaction(BASES, 'readonly').objectStore(BASES).getAll())
}

export function putBase(base) {
  // Bases come from Vue reactive state: structured clone can't take a Proxy.
  const plain = JSON.parse(JSON.stringify(base))
  return run(BASES, 'readwrite', tx => { tx.objectStore(BASES).put(plain) })
}

// Deleting a base only unlinks its fiches: one that also belongs to another
// base stays, one that belonged to this base alone is removed. Notes are kept.
export function deleteBase(baseId) {
  return run([BASES, ENTREPRISES], 'readwrite', tx => {
    tx.objectStore(BASES).delete(baseId)
    const req = tx.objectStore(ENTREPRISES).index('bases').openCursor(IDBKeyRange.only(baseId))
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) return
      detachFromBase(cursor, baseId)
      cursor.continue()
    }
  })
}

// ------------------------------------------------------------- fiches ------

// Merges freshly fetched fiches into whatever is already stored (a fiche
// shared with another base keeps that link) and links them to `baseId`.
export function addCompaniesToBase(baseId, companies) {
  if (!companies.length) return Promise.resolve()
  return run(ENTREPRISES, 'readwrite', tx => {
    const store = tx.objectStore(ENTREPRISES)
    for (const company of companies) {
      const getReq = store.get(company.siren)
      getReq.onsuccess = () => {
        const existing = getReq.result
        const bases = new Set(existing?.bases || [])
        bases.add(baseId)
        store.put({ ...company, bases: [...bases] })
      }
    }
  })
}

// Unlinks from `baseId` every fiche of that base whose siren isn't in
// `keepSirens` (companies that left the API's result set since last download).
export function pruneBase(baseId, keepSirens) {
  return run(ENTREPRISES, 'readwrite', tx => {
    const req = tx.objectStore(ENTREPRISES).index('bases').openCursor(IDBKeyRange.only(baseId))
    req.onsuccess = () => {
      const cursor = req.result
      if (!cursor) return
      if (!keepSirens.has(cursor.value.siren)) detachFromBase(cursor, baseId)
      cursor.continue()
    }
  })
}

// Unlinks specific fiches from one base (kept if another base still has them).
export function removeCompaniesFromBase(baseId, sirens) {
  return run(ENTREPRISES, 'readwrite', tx => {
    const store = tx.objectStore(ENTREPRISES)
    for (const siren of sirens) {
      const getReq = store.get(siren)
      getReq.onsuccess = () => {
        const company = getReq.result
        if (!company) return
        const remaining = company.bases.filter(id => id !== baseId)
        if (remaining.length) store.put({ ...company, bases: remaining })
        else store.delete(siren)
      }
    }
  })
}

export async function getCompaniesOfBase(baseId) {
  const db = await openDb()
  const index = db.transaction(ENTREPRISES, 'readonly').objectStore(ENTREPRISES).index('bases')
  return request(index.getAll(IDBKeyRange.only(baseId)))
}

export async function countCompaniesOfBase(baseId) {
  const db = await openDb()
  const index = db.transaction(ENTREPRISES, 'readonly').objectStore(ENTREPRISES).index('bases')
  return request(index.count(IDBKeyRange.only(baseId)))
}

// ---------------------------------------------------------- annotations ---

// Personal data attached to a siren (not to a base): a free-text note and a
// single emoji, in one record. Kept apart from the fiches so re-downloading
// one never overwrites them.
export async function getAllAnnotations() {
  const db = await openDb()
  const list = await request(db.transaction(NOTES, 'readonly').objectStore(NOTES).getAll())
  return {
    notes: Object.fromEntries(list.filter(a => a.text).map(a => [a.siren, a.text])),
    emojis: Object.fromEntries(list.filter(a => a.emoji).map(a => [a.siren, a.emoji]))
  }
}

// Updates only the given fields (`text` and/or `emoji`) on each siren, in one
// transaction; a record is removed once both fields are empty.
export function patchAnnotations(sirens, patch) {
  return run(NOTES, 'readwrite', tx => {
    const store = tx.objectStore(NOTES)
    for (const siren of sirens) {
      const getReq = store.get(siren)
      getReq.onsuccess = () => {
        const merged = { ...getReq.result, siren, ...patch }
        if (merged.text || merged.emoji) store.put(merged)
        else store.delete(siren)
      }
    }
  })
}

export const patchAnnotation = (siren, patch) => patchAnnotations([siren], patch)
