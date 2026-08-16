export const LOVE_LETTER_OPEN_DURATION_SECONDS = 4.2
export const LOVE_LETTER_INTERACTION_DISTANCE = 2.45
export const LOVE_LETTER_INTERACTION_DOT = 0.28

export function isLoveLetterInteractionEligible(
  distance: number,
  viewDot: number,
) {
  return (
    Number.isFinite(distance) &&
    Number.isFinite(viewDot) &&
    distance <= LOVE_LETTER_INTERACTION_DISTANCE &&
    viewDot >= LOVE_LETTER_INTERACTION_DOT
  )
}
