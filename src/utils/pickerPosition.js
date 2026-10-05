// Approximate size of the emoji picker, to decide where it fits.
const PICKER_HEIGHT = 260
const PICKER_WIDTH = 280

// `position: fixed` style placing the picker next to a button's bounding rect:
// below it when there is room, above it otherwise, kept inside the viewport.
export function pickerStyle(rect) {
  const left = Math.max(8, Math.min(rect.left, window.innerWidth - PICKER_WIDTH - 8))
  return rect.bottom + PICKER_HEIGHT < window.innerHeight
    ? { left: left + 'px', top: rect.bottom + 4 + 'px' }
    : { left: left + 'px', bottom: window.innerHeight - rect.top + 4 + 'px' }
}
