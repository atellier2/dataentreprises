// Palette offered in the picker; any other emoji can still be typed or pasted.
export const EMOJI_PALETTE = [
  '✅', '❌', '⭐', '🔥', '👍', '👎', '❓', '⚠️', '🚩', '📌',
  '📞', '📧', '🤝', '📅', '⏳', '💰', '🏆', '🎯', '💡', '👀',
  '🟢', '🟠', '🔴', '🔵', '🟣', '🟡', '⚫', '⚪', '🏢', '🏭'
]

const segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })
const EMOJI_RE = /\p{Extended_Pictographic}|\p{Regional_Indicator}|⃣/u

// One emoji is often several code points (flags, skin tones, ⚠️ with its
// variation selector...), so "a single character" means a single grapheme.
// Returns the first emoji found in `text`, or '' if there is none.
export function normalizeEmoji(text) {
  for (const { segment } of segmenter.segment(String(text ?? ''))) {
    if (EMOJI_RE.test(segment)) return segment
  }
  return ''
}
