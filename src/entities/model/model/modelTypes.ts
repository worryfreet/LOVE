import type { ComponentType, LazyExoticComponent } from 'react'
import type {
  CameraConfig,
  ReviewView,
} from '@/shared/three'
import type { FirstPersonConfig } from '@/shared/three'
import type {
  ModelParameterConfiguration,
  ModelParameterSchema,
  ModelParameterValues,
} from './modelParameterTypes'
import type { EditableFlowerSpeciesId } from '../items/flower-collection/core/types'

export type {
  BooleanModelParameter,
  ColorModelParameter,
  ModelParameterConfiguration,
  ModelParameterSchema,
  ModelParameterValue,
  ModelParameterValues,
  NumberModelParameter,
  SelectModelParameter,
} from './modelParameterTypes'

export type { FirstPersonConfig } from '@/shared/three'
export type {
  CameraConfig as ModelCameraConfig,
  ReviewView as ModelReviewView,
} from '@/shared/three'

export type ModelScale = 'small' | 'medium' | 'large'

export type ModelStatus = 'ready' | 'beta'

export type ModelViewerChrome = 'platform' | 'model'

export interface ModelAction {
  id: string
  label: string
  hint: string
}

export interface ModelInspectionLayer {
  id: string
  name: string
  material: string
  function: string
  assembly: string
  componentIds: readonly string[]
}

export interface ModelSceneInspection {
  active: boolean
  layers: readonly ModelInspectionLayer[]
  selectedLayerId: string | null
  onSelectLayer: (layerId: string) => void
}

export interface ModelCommand {
  name: string
  nonce: number
}

/** 模型实验室只依赖的作物状态端口，由场景层的 CropState 直接满足。 */
export interface ModelCropState {
  readonly id: string
  readonly cropId: string
  readonly age: number
  readonly stage: string
  readonly health: number
  readonly stress: number
  readonly leafArea: number
  readonly rootProgress: number
  readonly floweringProgress: number
  readonly pollinationProgress: number
  readonly fruitSetProgress: number
  readonly ripeningProgress: number
  readonly harvestable: boolean
  readonly damageHistory: readonly {
    id: string
    day: number
    kind: string
    severity: number
  }[]
  readonly activeIssues: readonly string[]
  readonly issueProgress: number
  readonly recoveryProgress: number
  readonly appliedInterventionIds: readonly string[]
  readonly completed: boolean
}

export interface ModelSceneProps {
  command: ModelCommand | null
  reducedMotion?: boolean
  context?: 'viewer' | 'scene'
  captureMode?: boolean
  inspection?: ModelSceneInspection
  /** 查看器按模型 schema 规范化后的实时设计参数。 */
  parameters?: ModelParameterValues
  /** 从研究园进入实验室时，复用主场景的同一份作物状态。 */
  cropState?: ModelCropState
}

export type ModelSceneComponent = ComponentType<ModelSceneProps>

export interface ModelSceneModule {
  default: ModelSceneComponent
}

type ModelCameraConfig = CameraConfig
type ModelReviewView = ReviewView

export interface ModelCatalogEntry {
  id: string
  index: string
  name: string
  englishName: string
  description: string
  scale: ModelScale
  category: string
  year: string
  status: ModelStatus
  tags: string[]
  accent: string
  stage: string
  previewImage: string
  viewerChrome?: ModelViewerChrome
  camera: ModelCameraConfig
  reviewCameras?: Partial<Record<ModelReviewView, ModelCameraConfig>>
  mobileCamera?: ModelCameraConfig
  actionCameras?: Record<string, ModelCameraConfig>
  mobileActionCameras?: Record<string, ModelCameraConfig>
  actions: ModelAction[]
  parameters?: readonly ModelParameterSchema[]
  /** 仓库内按模型隔离的自定义配置；查看器会在代码默认值之前读取。 */
  parameterConfiguration?: ModelParameterConfiguration
  parameterPanel?: {
    title: string
    resetLabel: string
    preview?: 'hydrangea-petal' | EditableFlowerSpeciesId
    /** 默认页仅展示会显著改变整株外观的高频参数，并按此顺序排列。 */
    quickParameterIds?: readonly string[]
    /** 已确认未进入当前物种运行时的历史参数，不再暴露给用户。 */
    hiddenParameterIds?: readonly string[]
  }
  inspectionLayers?: readonly ModelInspectionLayer[]
  firstPerson?: FirstPersonConfig
  sceneLighting?: {
    lockStage?: boolean
    stageTone?: 'light' | 'dark'
    exposure?: number
    ambient?: {
      color: string
      intensity: number
    }
    hemisphere?: {
      skyColor: string
      groundColor: string
      intensity: number
    }
    keyLight?: {
      position: [number, number, number]
      color: string
      intensity: number
      shadowMapSize?: number
    }
    rimLight?: {
      position: [number, number, number]
      color: string
      intensity: number
    }
    accentSpot?: boolean
    contactShadowFrames?: number
    /** 实时查看器允许的最高设备像素比；高密度模型可按自身预算收紧。 */
    maxDpr?: number
    /** 允许模型参数选择器覆盖实时画布 DPR 上限。 */
    parameterDpr?: {
      parameterId: string
      values: Readonly<Record<string, number>>
    }
    fog?: {
      kind: 'linear' | 'exp2'
      near?: number
      far?: number
      density?: number
    }
    ground?: {
      color: string
      gridMain: string
      gridSub: string
    }
  }
}

export interface ModelDefinition extends ModelCatalogEntry {
  Scene:
    | ModelSceneComponent
    | LazyExoticComponent<ModelSceneComponent>
}
