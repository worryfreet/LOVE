export {
  DEFAULT_ENVELOPE_DIMENSIONS,
  ENVELOPE_LOCAL_FRAME,
  ENVELOPE_MATERIAL_SLOTS,
  ENVELOPE_PIVOTS,
  resolveEnvelopeDimensions,
  resolveEnvelopeOpenState,
  type EnvelopeDimensions,
  type EnvelopeOpenPhase,
  type EnvelopeOpenState,
} from './model/envelope'
export {
  DEFAULT_LOVE_LETTER_CONTENT,
  LOVE_LETTER_TEXT_LIMITS,
  resolveLoveLetterContent,
  sanitizeLoveLetterText,
  type LoveLetterContent,
} from './model/loveLetter'
export {
  EnvelopePartModel,
  type EnvelopeMaterials,
  type EnvelopePartModelProps,
} from './ui/EnvelopePartModel'
export {
  CottageEnvelope,
  type CottageEnvelopeProps,
} from './ui/CottageEnvelope'
