import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import type { PartParameterValues } from '../../../model/partTypes'
import { RoundTablePartModel } from './RoundTablePartModel'

export interface CottageRoundTableProps {
  readonly parameters: PartParameterValues
  readonly quality?: 'desktop' | 'mobile'
  readonly id?: string
}

function metersOr(value: unknown, fallback: number) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return number > 10 ? number / 1000 : number
}

export function CottageRoundTable({
  parameters,
  quality = 'desktop',
  id = 'part:cottage-round-table',
}: CottageRoundTableProps) {
  const woodColor = String(parameters.woodColor ?? '#A96E35')
  const materials = useMemo(
    () => ({
      wood: new MeshStandardMaterial({
        color: woodColor,
        metalness: 0.01,
        roughness: 0.5,
      }),
      edge: new MeshStandardMaterial({
        color: '#7B4825',
        metalness: 0.01,
        roughness: 0.58,
      }),
    }),
    [woodColor],
  )

  useEffect(
    () => () => Object.values(materials).forEach((material) => material.dispose()),
    [materials],
  )

  return (
    <RoundTablePartModel
      id={id}
      dimensions={{
        diameter: metersOr(parameters.diameter, 1.15),
        height: metersOr(parameters.height, 0.74),
        topThickness: metersOr(parameters.topThickness, 0.055),
      }}
      materials={materials}
      quality={quality}
    />
  )
}
