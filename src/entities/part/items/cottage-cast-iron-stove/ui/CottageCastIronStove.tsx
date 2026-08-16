import { useEffect, useMemo, type ReactNode } from 'react'
import { MeshPhysicalMaterial, MeshStandardMaterial } from 'three'
import type { PartParameterValues } from '../../../model/partTypes'
import { CastIronStovePartModel } from './CastIronStovePartModel'

export interface CottageCastIronStoveProps {
  readonly parameters: PartParameterValues
  readonly quality?: 'desktop' | 'mobile'
  readonly id?: string
  readonly flueAccessory?: ReactNode
}

function metersOr(value: unknown, fallback: number) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return number > 10 ? number / 1000 : number
}

export function CottageCastIronStove({
  parameters,
  quality = 'desktop',
  id = 'part:cottage-cast-iron-stove',
  flueAccessory,
}: CottageCastIronStoveProps) {
  const fireLit = parameters.fireLit === undefined
    ? true
    : Boolean(parameters.fireLit)
  const color = String(parameters.color ?? '#181716')
  const materials = useMemo(
    () => ({
      castIron: new MeshStandardMaterial({
        color,
        metalness: 0.42,
        roughness: 0.58,
      }),
      glass: new MeshPhysicalMaterial({
        color: '#241c18',
        metalness: 0.04,
        roughness: 0.16,
        transmission: 0.22,
        transparent: true,
        opacity: 0.82,
      }),
      hardware: new MeshStandardMaterial({
        color: '#b7a792',
        metalness: 0.86,
        roughness: 0.26,
      }),
      fire: new MeshStandardMaterial({
        color: '#ffb45c',
        emissive: '#ff6a24',
        emissiveIntensity: fireLit ? 4.6 : 0,
        roughness: 0.48,
      }),
    }),
    [color, fireLit],
  )

  useEffect(
    () => () => Object.values(materials).forEach((material) => material.dispose()),
    [materials],
  )

  return (
    <CastIronStovePartModel
      id={id}
      dimensions={{
        width: metersOr(parameters.width, 0.62),
        depth: metersOr(parameters.depth, 0.5),
        height: metersOr(parameters.height, 0.82),
      }}
      materials={materials}
      fireLit={fireLit}
      quality={quality}
      flueAccessory={flueAccessory}
    />
  )
}
