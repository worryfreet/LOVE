import { useEffect, useMemo } from 'react'
import {
  Color,
  DoubleSide,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  Vector2,
} from 'three'
import type { PartParameterValues } from '../../../model/partTypes'
import {
  createEnvelopePaperTextures,
  disposeEnvelopePaperTextures,
} from '../lib/envelopePaperTextures'
import { EnvelopePartModel } from './EnvelopePartModel'

export interface CottageEnvelopeProps {
  readonly parameters: PartParameterValues
  readonly quality?: 'desktop' | 'mobile'
  readonly id?: string
  readonly openProgress?: number
  readonly onActivate?: () => void
}

function numberOr(value: unknown, fallback: number) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function metersOr(value: unknown, fallback: number, threshold = 10) {
  const number = numberOr(value, fallback)
  return number > threshold ? number / 1000 : number
}

export function CottageEnvelope({
  parameters,
  quality = 'desktop',
  id = 'part:cottage-envelope',
  openProgress,
  onActivate,
}: CottageEnvelopeProps) {
  const paperColor = String(parameters.paperColor ?? '#EEDDBB')
  const sealColor = String(parameters.sealColor ?? '#B76870')
  const paperTextures = useMemo(
    () => createEnvelopePaperTextures(quality === 'desktop' ? 96 : 64),
    [quality],
  )
  const materials = useMemo(() => {
    const innerColor = new Color(paperColor).lerp(new Color('#C9A879'), 0.14)
    const edgeColor = new Color(paperColor).multiplyScalar(0.72)
    const waxDetailColor = new Color(sealColor).multiplyScalar(0.58)
    const paperMaterial = (color: Color | string, roughness = 0.88) =>
      new MeshPhysicalMaterial({
        color,
        map: paperTextures.color,
        roughness,
        roughnessMap: paperTextures.roughness,
        normalMap: paperTextures.normal,
        normalScale: new Vector2(0.11, 0.08),
        metalness: 0,
        clearcoat: 0.025,
        clearcoatRoughness: 0.9,
        side: DoubleSide,
      })
    return {
      paper: paperMaterial(paperColor, 0.9),
      paperInner: paperMaterial(innerColor, 0.94),
      paperEdge: new MeshStandardMaterial({
        color: edgeColor,
        roughness: 0.96,
        side: DoubleSide,
      }),
      letter: paperMaterial('#FFF7E6', 0.92),
      ink: new MeshStandardMaterial({
        color: '#704A40',
        roughness: 0.98,
      }),
      wax: new MeshPhysicalMaterial({
        color: sealColor,
        roughness: 0.38,
        metalness: 0,
        clearcoat: 0.28,
        clearcoatRoughness: 0.5,
      }),
      waxDetail: new MeshStandardMaterial({
        color: waxDetailColor,
        roughness: 0.54,
        side: DoubleSide,
      }),
      adhesive: new MeshStandardMaterial({
        color: innerColor.clone().multiplyScalar(0.78),
        roughness: 0.98,
      }),
    }
  }, [paperColor, paperTextures, sealColor])

  useEffect(
    () => () => Object.values(materials).forEach((material) => material.dispose()),
    [materials],
  )
  useEffect(
    () => () => disposeEnvelopePaperTextures(paperTextures),
    [paperTextures],
  )

  return (
    <EnvelopePartModel
      id={id}
      dimensions={{
        width: metersOr(parameters.width, 0.22),
        depth: metersOr(parameters.depth, 0.16),
        paperThickness: metersOr(parameters.paperThickness, 0.00035, 0.05),
      }}
      materials={materials}
      openProgress={openProgress ?? numberOr(parameters.openProgress, 0)}
      quality={quality}
      onActivate={onActivate}
    />
  )
}
