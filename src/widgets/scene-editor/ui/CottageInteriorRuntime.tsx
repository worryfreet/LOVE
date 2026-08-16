import { TransformControls } from '@react-three/drei'
import { useRef, useSyncExternalStore } from 'react'
import { Group, type Mesh } from 'three'
import {
  HYDRANGEA_CUSTOM_CONFIGURATION,
  HydrangeaAssembly,
  type ModelParameterValues,
} from '@/entities/model'
import {
  CottageCandle,
  CottageCastIronStove,
  CottageLoveseatSofa,
  CottageLowCabinet,
  CottagePhotoFrame,
  CottageRoundTable,
  CottageSingleBed,
  CottageStringLights,
  CottageWoodChair,
  type LoveLetterContent,
  type PartParameterValues,
} from '@/entities/part'
import {
  COTTAGE_FLOWER_GARDEN_LAYOUT,
  COTTAGE_TABLE_HYDRANGEA_OCCURRENCES,
  cottagePortalRuntime,
  getCottageInteriorInstanceBounds,
  type CottageInteriorInstance,
  type CottageInteriorPoint,
} from '@/entities/scene'
import type { CottageInteriorTransformMode } from '../model/cottageInteriorEditorCatalog'
import { InteractiveCottageEnvelope } from './InteractiveCottageEnvelope'

const COTTAGE_TABLE_HYDRANGEA_PARAMETERS = {
  desktop: {
    ...(HYDRANGEA_CUSTOM_CONFIGURATION.values as ModelParameterValues),
    renderQuality: 'medium',
  },
  mobile: {
    ...(HYDRANGEA_CUSTOM_CONFIGURATION.values as ModelParameterValues),
    renderQuality: 'low',
  },
} as const

function isCottageDoorwayPreviewPart(instance: CottageInteriorInstance) {
  return (
    instance.partId === 'cottage-round-table' ||
    instance.partId === 'cottage-wood-chair' ||
    instance.partId === 'cottage-low-cabinet' ||
    instance.partId === 'cottage-candle' ||
    instance.partId === 'cottage-envelope' ||
    instance.partId === 'cottage-photo-frame'
  )
}

function TableHydrangea({
  occurrence,
  quality,
}: {
  occurrence: (typeof COTTAGE_TABLE_HYDRANGEA_OCCURRENCES)[number]
  quality: 'desktop' | 'mobile'
}) {
  const bloomRef = useRef<Group>(null)
  return (
    <group
      name={occurrence.id}
      position={occurrence.position}
      rotation={[0, occurrence.rotationY, 0]}
      scale={occurrence.scale}
      userData={{
        semanticId: occurrence.id,
        modelId: 'hydrangea',
        source: 'model-library-assembly',
      }}
    >
      <HydrangeaAssembly
        bloomRef={bloomRef}
        parameters={COTTAGE_TABLE_HYDRANGEA_PARAMETERS[quality]}
      />
    </group>
  )
}

function DefaultTableHydrangeas({
  tableHeight,
  quality,
}: {
  tableHeight: number
  quality: 'desktop' | 'mobile'
}) {

  return (
    <group
      name="cottage.table.hydrangeas"
      position={[0.22, tableHeight, -0.08]}
      userData={{
        semanticId: 'cottage.table.hydrangeas',
        editable: false,
        modelId: 'hydrangea',
        occurrenceCount: COTTAGE_TABLE_HYDRANGEA_OCCURRENCES.length,
      }}
    >
      <mesh position={[0, 0.055, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.055, 0.044, 0.11, 18]} />
        <meshPhysicalMaterial
          color="#d9c6aa"
          roughness={0.32}
          clearcoat={0.62}
          clearcoatRoughness={0.28}
        />
      </mesh>
      <mesh position={[0, 0.105, 0]}>
        <torusGeometry args={[0.052, 0.008, 8, 18]} />
        <meshStandardMaterial color="#bca489" roughness={0.52} />
      </mesh>
      {COTTAGE_TABLE_HYDRANGEA_OCCURRENCES.map((occurrence) => (
        <TableHydrangea
          key={occurrence.id}
          occurrence={occurrence}
          quality={quality}
        />
      ))}
    </group>
  )
}

function InteriorPartVisual({
  instance,
  quality,
  editMode,
  letterInteractionEnabled,
  onReadLoveLetter,
}: {
  instance: CottageInteriorInstance
  quality: 'desktop' | 'mobile'
  editMode: boolean
  letterInteractionEnabled: boolean
  onReadLoveLetter: (content: LoveLetterContent) => void
}) {
  const parameters = instance.parameters as PartParameterValues
  const id = `part:${instance.id}`
  switch (instance.partId) {
    case 'cottage-single-bed':
      return <CottageSingleBed id={id} parameters={parameters} quality={quality} />
    case 'cottage-loveseat-sofa':
      return <CottageLoveseatSofa id={id} parameters={parameters} quality={quality} />
    case 'cottage-photo-frame':
      return <CottagePhotoFrame id={id} parameters={parameters} quality={quality} />
    case 'cottage-cast-iron-stove': {
      return (
        <CottageCastIronStove
          id={id}
          parameters={parameters}
          quality={quality}
          flueAccessory={(
            <mesh
              name={`${id}:flue-pipe`}
              position={[0, 0.41, 0]}
              castShadow
              userData={{ semanticPart: 'flue-pipe', attachedTo: 'socket.flue' }}
            >
              <cylinderGeometry args={[0.075, 0.075, 0.82, quality === 'mobile' ? 12 : 20]} />
              <meshStandardMaterial color="#1b1918" metalness={0.38} roughness={0.68} />
            </mesh>
          )}
        />
      )
    }
    case 'cottage-round-table': {
      const rawHeight = Number(parameters.height)
      const tableHeight = Number.isFinite(rawHeight)
        ? rawHeight > 10
          ? rawHeight / 1_000
          : rawHeight
        : 0.74
      return (
        <group>
          <CottageRoundTable id={id} parameters={parameters} quality={quality} />
          <DefaultTableHydrangeas
            tableHeight={tableHeight}
            quality={quality}
          />
        </group>
      )
    }
    case 'cottage-wood-chair':
      return <CottageWoodChair id={id} parameters={parameters} quality={quality} />
    case 'cottage-low-cabinet':
      return <CottageLowCabinet id={id} parameters={parameters} quality={quality} />
    case 'cottage-candle':
      return <CottageCandle id={id} parameters={parameters} quality={quality} />
    case 'cottage-envelope':
      return (
        <InteractiveCottageEnvelope
          id={id}
          parameters={parameters}
          quality={quality}
          editMode={editMode}
          interactionEnabled={letterInteractionEnabled}
          onRead={onReadLoveLetter}
        />
      )
    case 'cottage-string-lights':
      return (
        <CottageStringLights
          id={id}
          parameters={parameters}
          points={instance.path}
          quality={quality}
        />
      )
  }
}

function SelectionBounds({ instance }: { instance: CottageInteriorInstance }) {
  const bounds = getCottageInteriorInstanceBounds(instance)
  if (instance.partId === 'cottage-string-lights') return null
  const height = bounds[1]
  const centerY =
    instance.partId === 'cottage-photo-frame' &&
    instance.parameters.mount !== 'table'
      ? 0
      : height / 2
  return (
    <mesh
      name={`${instance.id}:selection-bounds`}
      position={[0, centerY, 0]}
      renderOrder={24}
      raycast={() => null}
    >
      <boxGeometry args={[bounds[0] * 1.04, height * 1.04, bounds[2] * 1.04]} />
      <meshBasicMaterial
        color="#ffb56f"
        wireframe
        transparent
        opacity={0.8}
        depthTest={false}
      />
    </mesh>
  )
}

function TransformableInstance({
  instance,
  selected,
  editMode,
  transformMode,
  selectedPathPointIndex,
  quality,
  letterInteractionEnabled,
  onSelect,
  onPathPointSelect,
  onCommitTransform,
  onCommitPathPoint,
  onReadLoveLetter,
}: {
  instance: CottageInteriorInstance
  selected: boolean
  editMode: boolean
  transformMode: CottageInteriorTransformMode
  selectedPathPointIndex: number | null
  quality: 'desktop' | 'mobile'
  letterInteractionEnabled: boolean
  onSelect: (instanceId: string) => void
  onPathPointSelect: (index: number | null) => void
  onCommitTransform: (
    instanceId: string,
    next: {
      position: CottageInteriorPoint
      rotation: CottageInteriorPoint
      scale: CottageInteriorPoint
    },
  ) => void
  onCommitPathPoint: (
    instanceId: string,
    index: number,
    point: CottageInteriorPoint,
  ) => void
  onReadLoveLetter: (content: LoveLetterContent) => void
}) {
  const rootRef = useRef<Group>(null)
  const pointRef = useRef<Mesh>(null)
  const content = (
    <group
      ref={rootRef}
      name={instance.id}
      position={[instance.position.x, instance.position.y, instance.position.z]}
      rotation={[instance.rotation.x, instance.rotation.y, instance.rotation.z]}
      scale={[instance.scale.x, instance.scale.y, instance.scale.z]}
      onClick={(event) => {
        if (!editMode) return
        event.stopPropagation()
        onSelect(instance.id)
      }}
      userData={{
        semanticId: instance.id,
        partId: instance.partId,
        editable: true,
      }}
    >
      <InteriorPartVisual
        instance={instance}
        quality={quality}
        editMode={editMode}
        letterInteractionEnabled={letterInteractionEnabled}
        onReadLoveLetter={onReadLoveLetter}
      />
      {selected && <SelectionBounds instance={instance} />}
      {selected &&
        instance.partId === 'cottage-string-lights' &&
        instance.path?.map((point, index) => {
          const marker = (
            <mesh
              ref={index === selectedPathPointIndex ? pointRef : undefined}
              key={`${instance.id}:path-point:${index}`}
              name={`${instance.id}:path-point:${index}`}
              position={[point.x, point.y, point.z]}
              renderOrder={26}
              onClick={(event) => {
                event.stopPropagation()
                onPathPointSelect(index)
              }}
              userData={{ semanticId: `${instance.id}:path-point:${index}` }}
            >
              <sphereGeometry args={[index === selectedPathPointIndex ? 0.075 : 0.055, 12, 8]} />
              <meshBasicMaterial
                color={index === selectedPathPointIndex ? '#fff1c9' : '#ff9f5b'}
                depthTest={false}
              />
            </mesh>
          )
          return index === selectedPathPointIndex ? (
            <TransformControls
              key={`${instance.id}:path-control:${index}`}
              mode="translate"
              space="local"
              size={0.65}
              translationSnap={0.025}
              onMouseUp={() => {
                const object = pointRef.current
                if (!object) return
                onCommitPathPoint(instance.id, index, {
                  x: object.position.x,
                  y: object.position.y,
                  z: object.position.z,
                })
              }}
            >
              {marker}
            </TransformControls>
          ) : (
            marker
          )
        })}
    </group>
  )

  if (
    !selected ||
    !editMode ||
    instance.partId === 'cottage-string-lights'
  ) {
    return content
  }

  return (
    <TransformControls
      mode={transformMode}
      space={transformMode === 'translate' ? 'world' : 'local'}
      size={0.72}
      translationSnap={0.025}
      rotationSnap={Math.PI / 36}
      scaleSnap={0.025}
      onMouseUp={() => {
        const object = rootRef.current
        if (!object) return
        onCommitTransform(instance.id, {
          position: {
            x: object.position.x,
            y: object.position.y,
            z: object.position.z,
          },
          rotation: {
            x: object.rotation.x,
            y: object.rotation.y,
            z: object.rotation.z,
          },
          scale: {
            x: object.scale.x,
            y: object.scale.y,
            z: object.scale.z,
          },
        })
      }}
    >
      {content}
    </TransformControls>
  )
}

export function CottageInteriorRuntime({
  instances,
  editMode,
  selectedInstanceId,
  transformMode,
  selectedPathPointIndex,
  quality,
  onSelect,
  onPathPointSelect,
  onCommitTransform,
  onCommitPathPoint,
  onReadLoveLetter,
}: {
  instances: readonly CottageInteriorInstance[]
  editMode: boolean
  selectedInstanceId: string | null
  transformMode: CottageInteriorTransformMode
  selectedPathPointIndex: number | null
  quality: 'desktop' | 'mobile'
  onSelect: (instanceId: string) => void
  onPathPointSelect: (index: number | null) => void
  onCommitTransform: (
    instanceId: string,
    next: {
      position: CottageInteriorPoint
      rotation: CottageInteriorPoint
      scale: CottageInteriorPoint
    },
  ) => void
  onCommitPathPoint: (
    instanceId: string,
    index: number,
    point: CottageInteriorPoint,
  ) => void
  onReadLoveLetter: (content: LoveLetterContent) => void
}) {
  const { cottage } = COTTAGE_FLOWER_GARDEN_LAYOUT
  const portalSnapshot = useSyncExternalStore(
    cottagePortalRuntime.subscribe,
    cottagePortalRuntime.getSnapshot,
    cottagePortalRuntime.getSnapshot,
  )
  const showAllDetails = editMode || portalSnapshot.zone === 'interior'

  return (
    <group
      name="cottage.interior.parts"
      position={[cottage.centerX, 0, cottage.centerZ]}
      userData={{
        semanticId: 'cottage.interior.parts',
        instanceCount: instances.length,
        visibilityPolicy: 'portal-zone-with-doorway-preview',
        units: 'meter',
      }}
      onPointerMissed={() => {
        if (editMode) onSelect('')
      }}
    >
      <group
        name="cottage.interior.editable-details"
        userData={{
          semanticId: 'cottage.interior.editable-details',
          representation: showAllDetails ? 'full' : 'doorway-preview',
        }}
      >
        {instances.map((instance) => (
          <group
            key={instance.id}
            visible={showAllDetails || isCottageDoorwayPreviewPart(instance)}
          >
            <TransformableInstance
              instance={instance}
              selected={instance.id === selectedInstanceId}
              editMode={editMode}
              transformMode={transformMode}
              selectedPathPointIndex={
                instance.id === selectedInstanceId
                  ? selectedPathPointIndex
                  : null
              }
              quality={quality}
              letterInteractionEnabled={
                !editMode && portalSnapshot.zone === 'interior'
              }
              onSelect={onSelect}
              onPathPointSelect={onPathPointSelect}
              onCommitTransform={onCommitTransform}
              onCommitPathPoint={onCommitPathPoint}
              onReadLoveLetter={onReadLoveLetter}
            />
          </group>
        ))}
      </group>
    </group>
  )
}
