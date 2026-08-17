import { cottageInteriorPartCatalogEntries } from './model/cottageInteriorPartCatalog'

export const partCatalogRegistry = cottageInteriorPartCatalogEntries

export type {
  PartParameterSchema,
  PartParameterValues,
} from './model/partTypes'
export { CottageSingleBed } from './items/cottage-single-bed'
export { CottageLoveseatSofa } from './items/cottage-loveseat-sofa'
export { CottagePhotoFrame } from './items/cottage-photo-frame'
export { CottageCastIronStove } from './items/cottage-cast-iron-stove'
export { CottageRoundTable } from './items/cottage-round-table'
export { CottageWoodChair } from './items/cottage-wood-chair'
export { CottageLowCabinet } from './items/cottage-low-cabinet'
export { CottageBookcase } from './items/cottage-bookcase'
export { CottageCandle } from './items/cottage-candle'
export {
  CottageEnvelope,
  DEFAULT_LOVE_LETTER_CONTENT,
  resolveLoveLetterContent,
  type LoveLetterContent,
} from './items/cottage-envelope'
export { CottageStringLights } from './items/cottage-string-lights'
