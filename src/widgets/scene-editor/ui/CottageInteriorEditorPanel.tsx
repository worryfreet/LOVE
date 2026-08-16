import {
  Cable,
  Copy,
  Eye,
  ImagePlus,
  Move3d,
  Plus,
  Rotate3D,
  Scale3D,
  Trash2,
  Undo2,
  Upload,
  X,
} from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import {
  COTTAGE_INTERIOR_MAX_EMBEDDED_PHOTO_CHARACTERS,
  COTTAGE_INTERIOR_MAX_PATH_POINTS,
  COTTAGE_INTERIOR_MAX_PHOTOS,
  COTTAGE_INTERIOR_NAVIGATION,
  getCottageRoundTableTopY,
  hasCottageInteriorRenderablePath,
  type CottageInteriorInstance,
  type CottageInteriorPartId,
  type CottageInteriorPoint,
} from '@/entities/scene'
import {
  COTTAGE_INTERIOR_EDITOR_ASSETS,
  getCottageInteriorEditorAsset,
  type CottageInteriorTransformMode,
} from '../model/cottageInteriorEditorCatalog'
import '../styles/cottage-interior-editor.css'

export type { CottageInteriorTransformMode } from '../model/cottageInteriorEditorCatalog'

export interface CottageInteriorEditorPanelProps {
  instances: readonly CottageInteriorInstance[]
  selectedInstanceId: string | null
  transformMode: CottageInteriorTransformMode
  selectedPathPointIndex: number | null
  persistenceError: string | null
  photoSourceMode?: 'embedded' | 'project-gallery'
  onClose: () => void
  onPreviewEntry: () => void
  onAdd: (partId: CottageInteriorPartId) => void
  onSelect: (instanceId: string) => void
  onUpdate: (
    instanceId: string,
    update: (instance: CottageInteriorInstance) => CottageInteriorInstance,
  ) => void
  onDuplicate: (instanceId: string) => void
  onDelete: (instanceId: string) => void
  onRestoreDefaults: () => void
  onTransformModeChange: (mode: CottageInteriorTransformMode) => void
  onPathPointSelect: (index: number | null) => void
}

type PointKey = keyof CottageInteriorPoint

function parseFinite(value: string, fallback: number) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

async function imageFileToDataUrl(file: File) {
  if (file.size > 20_000_000) {
    throw new Error('图片文件不能超过 20 MB')
  }
  const bitmap = await createImageBitmap(file)
  try {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')
    if (!context) throw new Error('无法创建图片缩放画布')

    for (const maxEdge of [720, 600, 480]) {
      const ratio = Math.min(
        1,
        maxEdge / Math.max(bitmap.width, bitmap.height),
      )
      canvas.width = Math.max(1, Math.round(bitmap.width * ratio))
      canvas.height = Math.max(1, Math.round(bitmap.height * ratio))
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      for (const quality of [0.78, 0.66, 0.54]) {
        const encoded = canvas.toDataURL('image/jpeg', quality)
        if (
          encoded.length <= COTTAGE_INTERIOR_MAX_EMBEDDED_PHOTO_CHARACTERS
        ) {
          return encoded
        }
      }
    }
    throw new Error('图片内容过于复杂，请换一张更小的图片')
  } finally {
    bitmap.close()
  }
}

async function validatePhotoUrl(url: string) {
  const normalized = url.trim()
  if (!normalized) return
  const parsed = new URL(normalized, window.location.href)
  if (!['http:', 'https:', 'data:', 'blob:'].includes(parsed.protocol)) {
    throw new Error('图片地址必须使用 http、https、data 或 blob 协议')
  }
  await new Promise<void>((resolve, reject) => {
    const candidate = new window.Image()
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      candidate.crossOrigin = 'anonymous'
    }
    candidate.onload = () => resolve()
    candidate.onerror = () => reject(new Error('图片地址无法加载或不允许跨域读取'))
    candidate.src = parsed.href
  })
}

function VectorFields({
  label,
  value,
  step,
  onChange,
}: {
  label: string
  value: CottageInteriorPoint
  step: number
  onChange: (next: CottageInteriorPoint) => void
}) {
  return (
    <fieldset className="cottage-interior-vector">
      <legend>{label}</legend>
      {(['x', 'y', 'z'] as const).map((axis) => (
        <label key={axis}>
          <span>{axis.toUpperCase()}</span>
          <input
            type="number"
            step={step}
            value={Number(value[axis].toFixed(3))}
            onChange={(event) =>
              onChange({
                ...value,
                [axis]: parseFinite(event.target.value, value[axis]),
              })
            }
          />
        </label>
      ))}
    </fieldset>
  )
}

function NumericParameter({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string
  value: number
  min: number
  max: number
  step: number
  onChange: (value: number) => void
}) {
  return (
    <label className="cottage-interior-range">
      <span>
        {label}
        <output>{Number(value.toFixed(2))}</output>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
      />
    </label>
  )
}

export function CottageInteriorEditorPanel({
  instances,
  selectedInstanceId,
  transformMode,
  selectedPathPointIndex,
  persistenceError,
  photoSourceMode = 'embedded',
  onClose,
  onPreviewEntry,
  onAdd,
  onSelect,
  onUpdate,
  onDuplicate,
  onDelete,
  onRestoreDefaults,
  onTransformModeChange,
  onPathPointSelect,
}: CottageInteriorEditorPanelProps) {
  const [photoError, setPhotoError] = useState<string | null>(null)
  const [photoUrlDraft, setPhotoUrlDraft] = useState('')
  const photoValidationNonce = useRef(0)
  const selectedPhotoId = useRef<string | null>(null)
  const selected =
    instances.find((instance) => instance.id === selectedInstanceId) ?? null
  selectedPhotoId.current =
    selected?.partId === 'cottage-photo-frame' ? selected.id : null
  const selectedAsset = selected
    ? getCottageInteriorEditorAsset(selected.partId)
    : null
  const specializedParameterIds = new Set(
    selected?.partId === 'cottage-photo-frame'
      ? ['mount']
      : selected?.partId === 'cottage-string-lights'
        ? ['length', 'bulbSpacing', 'sag', 'warmth', 'intensity', 'lit']
        : selected?.partId === 'cottage-envelope'
          ? ['openProgress', 'letterTitle', 'letterSalutation', 'letterBody', 'letterSignature']
          : [],
  )
  const genericParameters =
    selectedAsset?.parameters.filter(
      (parameter) => !specializedParameterIds.has(parameter.id),
    ) ?? []
  const photoCount = instances.filter(
    (instance) => instance.partId === 'cottage-photo-frame',
  ).length
  const counts = useMemo(
    () =>
      new Map(
        COTTAGE_INTERIOR_EDITOR_ASSETS.map((asset) => [
          asset.id,
          instances.filter((instance) => instance.partId === asset.id).length,
        ]),
      ),
    [instances],
  )

  useEffect(() => {
    photoValidationNonce.current += 1
    setPhotoError(null)
    setPhotoUrlDraft(
      selected?.partId === 'cottage-photo-frame'
        ? String(selected.parameters.imageUrl ?? '')
        : '',
    )
  }, [selected?.id, selected?.parameters.imageUrl, selected?.partId])

  const updatePoint = (
    key: 'position' | 'rotation' | 'scale',
    next: CottageInteriorPoint,
  ) => {
    if (!selected) return
    onUpdate(selected.id, (instance) => ({ ...instance, [key]: next }))
  }
  const updateParameter = (key: string, value: number | string | boolean) => {
    if (!selected) return
    onUpdate(selected.id, (instance) => ({
      ...instance,
      parameters: { ...instance.parameters, [key]: value },
    }))
  }
  const updatePathPoint = (index: number, axis: PointKey, value: number) => {
    if (!selected?.path) return
    onUpdate(selected.id, (instance) => ({
      ...instance,
      path: instance.path?.map((point, pointIndex) =>
        pointIndex === index ? { ...point, [axis]: value } : point,
      ),
    }))
  }
  const addPathPoint = () => {
    if (
      !selected?.path ||
      selected.path.length >= COTTAGE_INTERIOR_MAX_PATH_POINTS
    ) {
      return
    }
    const path = [...selected.path]
    const first = path[0]
    const last = path.at(-1)
    const closed =
      Boolean(first && last) &&
      Math.hypot(
        (first?.x ?? 0) - (last?.x ?? 0),
        (first?.y ?? 0) - (last?.y ?? 0),
        (first?.z ?? 0) - (last?.z ?? 0),
      ) < 0.001
    const afterIndex =
      selectedPathPointIndex === null ||
      (closed && selectedPathPointIndex === path.length - 1)
        ? closed
          ? path.length - 2
          : path.length - 1
        : selectedPathPointIndex
    const source = path[afterIndex] ?? { x: 0, y: 2, z: 0 }
    const target = path[afterIndex + 1] ?? {
      x: source.x + 0.45,
      y: source.y,
      z: source.z,
    }
    const next = {
      x: (source.x + target.x) / 2,
      y: (source.y + target.y) / 2,
      z: (source.z + target.z) / 2,
    }
    path.splice(afterIndex + 1, 0, next)
    onUpdate(selected.id, (instance) => ({ ...instance, path }))
    onPathPointSelect(afterIndex + 1)
  }
  const deletePathPoint = (index: number) => {
    if (!selected?.path || selected.path.length <= 2) return
    const nextPath = selected.path.filter(
      (_, pointIndex) => pointIndex !== index,
    )
    if (!hasCottageInteriorRenderablePath(nextPath)) return
    onUpdate(selected.id, (instance) => ({
      ...instance,
      path: nextPath,
    }))
    onPathPointSelect(null)
  }
  const uploadPhoto = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !selected) return
    const requestNonce = ++photoValidationNonce.current
    const instanceId = selected.id
    try {
      setPhotoError(null)
      const imageUrl = await imageFileToDataUrl(file)
      if (
        requestNonce !== photoValidationNonce.current ||
        selectedPhotoId.current !== instanceId
      ) {
        return
      }
      setPhotoUrlDraft(imageUrl)
      onUpdate(instanceId, (instance) => ({
        ...instance,
        parameters: { ...instance.parameters, imageUrl },
      }))
    } catch (error) {
      if (
        requestNonce !== photoValidationNonce.current ||
        selectedPhotoId.current !== instanceId
      ) {
        return
      }
      setPhotoError(
        error instanceof Error ? error.message : '无法读取所选图片',
      )
    } finally {
      event.target.value = ''
    }
  }
  const applyPhotoUrlDraft = async () => {
    if (!selected || selected.partId !== 'cottage-photo-frame') return
    const requestNonce = ++photoValidationNonce.current
    const instanceId = selected.id
    const normalizedDraft = photoUrlDraft.trim()
    try {
      setPhotoError(null)
      await validatePhotoUrl(normalizedDraft)
      if (
        requestNonce !== photoValidationNonce.current ||
        selectedPhotoId.current !== instanceId
      ) {
        return
      }
      onUpdate(instanceId, (instance) => ({
        ...instance,
        parameters: { ...instance.parameters, imageUrl: normalizedDraft },
      }))
    } catch (error) {
      if (
        requestNonce !== photoValidationNonce.current ||
        selectedPhotoId.current !== instanceId
      ) {
        return
      }
      setPhotoError(
        error instanceof Error ? error.message : '图片地址无法加载',
      )
    }
  }

  return (
    <aside className="cottage-interior-editor" aria-label="小屋室内编辑器">
      <header className="cottage-interior-editor__header">
        <div>
          <small>INTERIOR / V4</small>
          <h2>室内编辑器</h2>
          <span>
            {instances.length} 个实例 · {photoCount}/{COTTAGE_INTERIOR_MAX_PHOTOS} 张照片
          </span>
        </div>
        <button type="button" onClick={onClose} aria-label="返回第一人称漫游">
          <X size={17} aria-hidden="true" />
        </button>
      </header>

      <button
        className="cottage-interior-entry-preview"
        type="button"
        onClick={onPreviewEntry}
      >
        <Eye size={14} aria-hidden="true" />
        从门内预览
      </button>

      {persistenceError && (
        <p className="cottage-interior-persistence-error" role="alert">
          {persistenceError}
        </p>
      )}

      <section className="cottage-interior-editor__catalog" aria-labelledby="interior-assets-title">
        <div className="cottage-interior-editor__section-title">
          <h3 id="interior-assets-title">零件库</h3>
          <button type="button" onClick={onRestoreDefaults}>
            <Undo2 size={13} aria-hidden="true" />
            恢复默认布局
          </button>
        </div>
        <div className="cottage-interior-assets">
          {COTTAGE_INTERIOR_EDITOR_ASSETS.map((asset) => {
            const maxed =
              asset.id === 'cottage-photo-frame' &&
              photoCount >= COTTAGE_INTERIOR_MAX_PHOTOS
            return (
              <button
                type="button"
                key={asset.id}
                disabled={maxed}
                onClick={() => onAdd(asset.id)}
                title={asset.description}
              >
                <i style={{ background: asset.accent }} aria-hidden="true" />
                <span>
                  <strong>{asset.name}</strong>
                  <small>{asset.category}</small>
                </span>
                <b>{counts.get(asset.id) ?? 0}</b>
                <Plus size={14} aria-hidden="true" />
              </button>
            )
          })}
        </div>
      </section>

      <section className="cottage-interior-editor__instances" aria-labelledby="interior-instances-title">
        <div className="cottage-interior-editor__section-title">
          <h3 id="interior-instances-title">场景实例</h3>
          <span>点击场景物体或列表选择</span>
        </div>
        <div>
          {instances.map((instance, index) => {
            const asset = getCottageInteriorEditorAsset(instance.partId)
            return (
              <button
                type="button"
                key={instance.id}
                data-active={instance.id === selectedInstanceId ? 'true' : undefined}
                onClick={() => onSelect(instance.id)}
              >
                <span style={{ background: asset?.accent }} aria-hidden="true" />
                <strong>{asset?.name ?? instance.partId}</strong>
                <small>#{String(index + 1).padStart(2, '0')}</small>
              </button>
            )
          })}
        </div>
      </section>

      {selected && selectedAsset && (
        <section className="cottage-interior-editor__inspector" aria-labelledby="interior-inspector-title">
          <div className="cottage-interior-editor__section-title">
            <h3 id="interior-inspector-title">{selectedAsset.name}</h3>
            <span>{selected.id}</span>
          </div>

          {selected.partId !== 'cottage-string-lights' && (
          <div className="cottage-interior-transform-modes" aria-label="变换模式">
            <button
              type="button"
              data-active={transformMode === 'translate' ? 'true' : undefined}
              onClick={() => onTransformModeChange('translate')}
            >
              <Move3d size={14} aria-hidden="true" /> 位移
            </button>
            <button
              type="button"
              data-active={transformMode === 'rotate' ? 'true' : undefined}
              onClick={() => onTransformModeChange('rotate')}
            >
              <Rotate3D size={14} aria-hidden="true" /> 旋转
            </button>
            <button
              type="button"
              data-active={transformMode === 'scale' ? 'true' : undefined}
              onClick={() => onTransformModeChange('scale')}
            >
              <Scale3D size={14} aria-hidden="true" /> 尺寸
            </button>
          </div>
          )}

          {selected.partId !== 'cottage-string-lights' && (
            <>
              <VectorFields
                label="位置 / 米"
                value={selected.position}
                step={0.05}
                onChange={(next) => updatePoint('position', next)}
              />
              <NumericParameter
                label="Y 轴旋转 / °"
                value={(selected.rotation.y * 180) / Math.PI}
                min={-180}
                max={180}
                step={1}
                onChange={(degrees) =>
                  updatePoint('rotation', {
                    ...selected.rotation,
                    y: (degrees * Math.PI) / 180,
                  })
                }
              />
            </>
          )}
          {selected.partId !== 'cottage-string-lights' && (
            <VectorFields
              label="三轴尺寸倍率"
              value={selected.scale}
              step={0.05}
              onChange={(next) =>
                updatePoint('scale', {
                  x: Math.min(3, Math.max(0.25, next.x)),
                  y: Math.min(3, Math.max(0.25, next.y)),
                  z: Math.min(3, Math.max(0.25, next.z)),
                })
              }
            />
          )}

          {genericParameters.length > 0 && (
            <div className="cottage-interior-part-parameters">
              <strong>零件参数</strong>
              {genericParameters.map((parameter) => {
                const current =
                  selected.parameters[parameter.id] ?? parameter.default
                if (parameter.type === 'number') {
                  return (
                    <NumericParameter
                      key={parameter.id}
                      label={`${parameter.label}${parameter.unit ? ` / ${parameter.unit}` : ''}`}
                      value={Number(current)}
                      min={parameter.min}
                      max={parameter.max}
                      step={parameter.step}
                      onChange={(value) =>
                        updateParameter(parameter.id, value)
                      }
                    />
                  )
                }
                if (parameter.type === 'color') {
                  return (
                    <label key={parameter.id}>
                      <span>{parameter.label}</span>
                      <input
                        type="color"
                        value={String(current)}
                        onChange={(event) =>
                          updateParameter(parameter.id, event.target.value)
                        }
                      />
                    </label>
                  )
                }
                if (parameter.type === 'enum') {
                  return (
                    <label key={parameter.id}>
                      <span>{parameter.label}</span>
                      <select
                        value={String(current)}
                        onChange={(event) =>
                          updateParameter(parameter.id, event.target.value)
                        }
                      >
                        {parameter.options.map((option) => (
                          <option key={option.value} value={option.value}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  )
                }
                if (parameter.type === 'text') {
                  return (
                    <label
                      key={parameter.id}
                      className="cottage-interior-part-text"
                    >
                      <span>{parameter.label}</span>
                      {parameter.multiline ? (
                        <textarea
                          value={String(current)}
                          maxLength={parameter.maxLength}
                          rows={8}
                          onChange={(event) =>
                            updateParameter(parameter.id, event.target.value)
                          }
                        />
                      ) : (
                        <input
                          type="text"
                          value={String(current)}
                          maxLength={parameter.maxLength}
                          onChange={(event) =>
                            updateParameter(parameter.id, event.target.value)
                          }
                        />
                      )}
                      <small>
                        {Array.from(String(current)).length}/{parameter.maxLength}
                      </small>
                    </label>
                  )
                }
                return (
                  <label key={parameter.id} className="cottage-interior-part-toggle">
                    <input
                      type="checkbox"
                      checked={Boolean(current)}
                      onChange={(event) =>
                        updateParameter(parameter.id, event.target.checked)
                      }
                    />
                    <span>{parameter.label}</span>
                  </label>
                )
              })}
            </div>
          )}

          {selected.partId === 'cottage-envelope' && (
            <NumericParameter
              label="信封打开"
              value={Number(selected.parameters.openProgress ?? 0)}
              min={0}
              max={1}
              step={0.01}
              onChange={(value) => updateParameter('openProgress', value)}
            />
          )}

          {selected.partId === 'cottage-photo-frame' && (
            <div className="cottage-interior-photo-controls">
              <label>
                <span>安装方式</span>
                <select
                  value={String(selected.parameters.mount ?? 'wall')}
                  onChange={(event) => {
                    const mount = event.target.value
                    const table = instances.find(
                      (instance) =>
                        instance.partId === 'cottage-round-table',
                    )
                    onUpdate(selected.id, (instance) => ({
                      ...instance,
                      position:
                        mount === 'table' && table
                          ? {
                              x: table.position.x - 0.2,
                              y: getCottageRoundTableTopY(table),
                              z: table.position.z + 0.08,
                            }
                          : {
                              ...instance.position,
                              y:
                                mount === 'table'
                                  ? COTTAGE_INTERIOR_NAVIGATION.floorTop
                                  : Math.max(
                                      COTTAGE_INTERIOR_NAVIGATION.floorTop +
                                        0.65,
                                      instance.position.y,
                                    ),
                            },
                      supportId:
                        mount === 'table' && table ? table.id : undefined,
                      parameters: { ...instance.parameters, mount },
                    }))
                  }}
                >
                  <option value="wall">墙挂</option>
                  <option value="table">桌放</option>
                </select>
              </label>
              {photoSourceMode === 'embedded' ? (
                <>
                  <label>
                    <span>图片 URL</span>
                    <input
                      type="url"
                      value={photoUrlDraft.startsWith('data:image/') ? '' : photoUrlDraft}
                      placeholder="留空使用默认纪念照片"
                      onChange={(event) => {
                        photoValidationNonce.current += 1
                        setPhotoUrlDraft(event.target.value)
                      }}
                      onBlur={() => void applyPhotoUrlDraft()}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.currentTarget.blur()
                      }}
                    />
                  </label>
                  <label className="cottage-interior-photo-upload">
                    <Upload size={14} aria-hidden="true" />
                    <span>选择本地图片</span>
                    <input type="file" accept="image/*" onChange={uploadPhoto} />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      photoValidationNonce.current += 1
                      setPhotoError(null)
                      setPhotoUrlDraft('')
                      updateParameter('imageUrl', '')
                    }}
                  >
                    <ImagePlus size={14} aria-hidden="true" /> 恢复默认照片
                  </button>
                  {photoError && <p role="alert">{photoError}</p>}
                </>
              ) : (
                <p>相框照片由“照片”步骤统一上传和排序，这里只调整安装位置与尺寸。</p>
              )}
            </div>
          )}

          {selected.partId === 'cottage-string-lights' && selected.path && (
            <div className="cottage-interior-path-editor">
              <div>
                <Cable size={15} aria-hidden="true" />
                <strong>彩灯路径控制点</strong>
                <button
                  type="button"
                  disabled={
                    selected.path.length >= COTTAGE_INTERIOR_MAX_PATH_POINTS
                  }
                  onClick={addPathPoint}
                >
                  <Plus size={13} aria-hidden="true" /> 新增点
                </button>
              </div>
              <NumericParameter
                label="灯泡间距 / m"
                value={Number(selected.parameters.bulbSpacing ?? 280) / 1000}
                min={0.12}
                max={0.8}
                step={0.01}
                onChange={(value) => updateParameter('bulbSpacing', value * 1000)}
              />
              <NumericParameter
                label="下垂 / m"
                value={Number(selected.parameters.sag ?? 100) / 1000}
                min={0}
                max={0.5}
                step={0.01}
                onChange={(value) => updateParameter('sag', value * 1000)}
              />
              <NumericParameter
                label="暖白比例"
                value={Number(selected.parameters.warmth ?? 0.24)}
                min={0}
                max={1}
                step={0.01}
                onChange={(value) => updateParameter('warmth', value)}
              />
              <NumericParameter
                label="发光强度"
                value={Number(selected.parameters.intensity ?? 1.15)}
                min={0}
                max={6}
                step={0.05}
                onChange={(value) => updateParameter('intensity', value)}
              />
              <label className="cottage-interior-path-toggle">
                <input
                  type="checkbox"
                  checked={selected.parameters.lit !== false}
                  onChange={(event) =>
                    updateParameter('lit', event.target.checked)
                  }
                />
                <span>点亮彩灯</span>
              </label>
              <ol>
                {selected.path.map((point, index) => (
                  <li
                    key={`${selected.id}-point-${index}`}
                    data-active={selectedPathPointIndex === index ? 'true' : undefined}
                  >
                    <button type="button" onClick={() => onPathPointSelect(index)}>
                      P{String(index + 1).padStart(2, '0')}
                    </button>
                    {(['x', 'y', 'z'] as const).map((axis) => (
                      <label key={axis}>
                        <span>{axis}</span>
                        <input
                          type="number"
                          step={0.05}
                          value={Number(point[axis].toFixed(3))}
                          onChange={(event) =>
                            updatePathPoint(
                              index,
                              axis,
                              parseFinite(event.target.value, point[axis]),
                            )
                          }
                        />
                      </label>
                    ))}
                    <button
                      type="button"
                      aria-label={`删除控制点 ${index + 1}`}
                      disabled={
                        (selected.path?.length ?? 0) <= 2 ||
                        !hasCottageInteriorRenderablePath(
                          selected.path?.filter(
                            (_, pointIndex) => pointIndex !== index,
                          ),
                        )
                      }
                      onClick={() => deletePathPoint(index)}
                    >
                      <Trash2 size={12} aria-hidden="true" />
                    </button>
                  </li>
                ))}
              </ol>
            </div>
          )}

          <div className="cottage-interior-instance-actions">
            <button type="button" onClick={() => onDuplicate(selected.id)}>
              <Copy size={14} aria-hidden="true" /> 复制
            </button>
            <button type="button" onClick={() => onDelete(selected.id)}>
              <Trash2 size={14} aria-hidden="true" /> 删除
            </button>
          </div>
        </section>
      )}
    </aside>
  )
}
