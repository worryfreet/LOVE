import { useEffect, useMemo } from 'react'
import { MeshStandardMaterial } from 'three'
import type { PartParameterValues } from '../../../model/partTypes'
import { CandlePartModel } from './CandlePartModel'

export interface CottageCandleProps {
  readonly parameters: PartParameterValues
  readonly quality?: 'desktop' | 'mobile'
  readonly id?: string
}

function metersOr(value: unknown, fallback: number) {
  const number = Number(value)
  if (!Number.isFinite(number)) return fallback
  return number > 10 ? number / 1000 : number
}

export function CottageCandle({
  parameters,
  quality = 'desktop',
  id = 'part:cottage-candle',
}: CottageCandleProps) {
  const waxColor = String(parameters.color ?? '#F5E4B7')
  const lit = parameters.lit === undefined ? true : Boolean(parameters.lit)
  const materials = useMemo(
    () => ({
      wax: new MeshStandardMaterial({
        color: waxColor,
        roughness: 0.62,
        metalness: 0,
      }),
      wick: new MeshStandardMaterial({
        color: '#2B211D',
        roughness: 0.95,
      }),
      flameCore: new MeshStandardMaterial({
        color: '#FFF8C8',
        emissive: '#FFF0A8',
        emissiveIntensity: lit ? 7 : 0,
        roughness: 0.25,
      }),
      flameGlow: new MeshStandardMaterial({
        color: '#FFB04A',
        emissive: '#FF6F28',
        emissiveIntensity: lit ? 5 : 0,
        roughness: 0.3,
        transparent: true,
        opacity: 0.82,
        depthWrite: false,
      }),
    }),
    [lit, waxColor],
  )

  useEffect(
    () => () => Object.values(materials).forEach((material) => material.dispose()),
    [materials],
  )

  return (
    <CandlePartModel
      id={id}
      dimensions={{
        diameter: metersOr(parameters.diameter, 0.065),
        height: metersOr(parameters.height, 0.16),
      }}
      materials={materials}
      lit={lit}
      quality={quality}
    />
  )
}
