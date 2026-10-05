# Prospection

Application web de prospection : elle permet de constituer des **bases locales d'entreprises françaises**, de les filtrer et de les annoter. 

Les données viennent de l'API publique [recherche-entreprises.api.gouv.fr](https://recherche-entreprises.api.gouv.fr).

➡️Vous pouvez utiliser directement https://atellier2.github.io/dataentreprises/

⚠️Les données sont stockées dans votre navigateur sous forme de base locale.
Ne supprimez pas les données de navigation au risque de perdre la base.
## Comment ça marche

1. **Créer une base** : on définit des critères (département, activité NAF, section, forme juridique, taille TPE/PME/ETI, tranche d'effectif).
2. **Télécharger** : l'app interroge l'API page par page (25 fiches par page, avec une courte pause et des nouvelles tentatives en cas d'erreur) et stocke les fiches dans le navigateur. Le téléchargement peut être annulé. Une recherche est limitée à 50 000 résultats, il faut affiner les filtres au-delà.
3. **Consulter** : une fois la base téléchargée, on filtre à nouveau en local (facettes, recherche texte, siège ou établissements, entreprises fermées), sans rappeler l'API.
4. **Annoter** : chaque entreprise peut recevoir une note et un emoji. Ces annotations sont indépendantes des bases : un nouveau téléchargement ne les écrase pas.
5. **Mettre à jour** : modifier les critères relance le téléchargement. Les fiches qui ne correspondent plus sont retirées seulement à la fin d'un téléchargement complet.

## Stockage

Tout reste dans le navigateur, dans **IndexedDB** (base `prospection`). Il n'y a pas de serveur ni de compte. Une entreprise n'est stockée qu'une fois, même si elle appartient à plusieurs bases. 

Supprimer une base ne supprime pas les notes.

#

## Lancer le projet

```bash
npm install
npm run dev      # serveur de développement
npm run build    # build de production dans dist/
npm run preview  # prévisualiser le build
```

## Déploiement

Chaque push sur `main` déclenche le workflow GitHub Actions ([deploy.yml](.github/workflows/deploy.yml)), qui construit l'app et la publie sur **GitHub Pages**. La variable `BASE_PATH` règle le chemin de base de l'app selon le nom du dépôt.
