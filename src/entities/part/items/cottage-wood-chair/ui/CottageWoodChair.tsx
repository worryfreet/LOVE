import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import type { PartParameterValues } from '../../../model/partTypes'
import { WoodChairPartModel } from './WoodChairPartModel'

export interface CottageWoodChairProps {
  readonly parameters: PartParameterValues
  readonly quality?: 'desktop' | 'mobile'
  readonly id?: string
}

function metersOr(value: unknown, fallback: number) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return number > 10 ? number / 1000 : number
}

export function CottageWoodChair({
  parameters,
  quality = 'desktop',
  id = 'part:cottage-wood-chair',
}: CottageWoodChairProps) {
  const woodColor = String(parameters.woodColor ?? '#A96E35')
  const cushionColor = String(parameters.cushionColor ?? '#F1E6D1')
  const materials = useMemo(
    () => ({
      wood: new MeshStandardMaterial({
        color: woodColor,
        roughness: 0.5,
        metalness: 0.01,
      }),
      cushion: new MeshStandardMaterial({
        color: cushionColor,
        roughness: 0.9,
        metalness: 0,
      }),
      piping: new MeshStandardMaterial({
        color: '#B96F72',
        roughness: 0.82,
        metalness: 0,
      }),
    }),
    [cushionColor, woodColor],
  )

  useEffect(
    () => () => Object.values(materials).forEach((material) => material.dispose()),
    [materials],
  )

  return (
    <WoodChairPartModel
      id={id}
      dimensions={{
        width: metersOr(parameters.width, 0.46),
        depth: metersOr(parameters.depth, 0.5),
        height: metersOr(parameters.height, 0.88),
        seatHeight: metersOr(parameters.seatHeight, 0.46),
      }}
      materials={materials}
      hasCushion={parameters.hasCushion === undefined
        ? true
        : Boolean(parameters.hasCushion)}
      quality={quality}
    />
  )
}
