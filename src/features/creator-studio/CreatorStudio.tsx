'use client'

import Link from 'next/link'
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Copy,
  ExternalLink,
  ImagePlus,
  LayoutTemplate,
  Send,
  Share2,
  Trash2,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  resolveLoveExperienceConfig,
  type LoveProjectConfig,
  type ResolvedLovePhoto,
} from '@/domain/loveProjectConfig'
import type { CottageInteriorInstance } from '@/entities/scene'
import { GardenStageClient } from '@/features/garden-experience/GardenStageClient'
import { useCottageInteriorEditor } from '@/widgets/scene-editor/model/useCottageInteriorEditor'
import { CottageInteriorEditorPanel } from '@/widgets/scene-editor/ui/CottageInteriorEditorPanel'

export interface CreatorStudioProject {
  id: string
  publicSlug: string
  config: LoveProjectConfig
  version: number
  published: boolean
  photos: ResolvedLovePhoto[]
}

const STEPS = [
  { id: 'identity', label: '名字' },
  { id: 'photos', label: '照片' },
  { id: 'letter', label: '情书' },
  { id: 'ambience', label: '氛围' },
  { id: 'share', label: '发布' },
] as const

type StepId = (typeof STEPS)[number]['id']
type SaveState = 'saved' | 'saving' | 'error'

export function CreatorStudio({ initialProject }: { initialProject: CreatorStudioProject }) {
  const [config, setConfig] = useState(initialProject.config)
  const [photos, setPhotos] = useState(initialProject.photos)
  const [step, setStep] = useState<StepId>('identity')
  const [version, setVersion] = useState(initialProject.version)
  const versionRef = useRef(initialProject.version)
  const firstSave = useRef(true)
  const saveQueue = useRef<Promise<void>>(Promise.resolve())
  const [saveState, setSaveState] = useState<SaveState>('saved')
  const [message, setMessage] = useState<string | null>(null)
  const [published, setPublished] = useState(initialProject.published)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [credentials, setCredentials] = useState<{
    claimUrl: string
    recoveryCode: string
  } | null>(null)

  const syncInterior = useCallback((instances: CottageInteriorInstance[]) => {
    setConfig((current) => ({
      ...current,
      interior: { ...current.interior, instances },
    }))
  }, [])
  const editor = useCottageInteriorEditor(
    true,
    initialProject.config.interior.instances as CottageInteriorInstance[],
    syncInterior,
  )
  const renderConfig = useMemo(
    () =>
      resolveLoveExperienceConfig(
        {
          ...config,
          interior: { ...config.interior, instances: editor.instances },
        },
        photos,
      ),
    [config, editor.instances, photos],
  )

  const persistDraft = useCallback(
    (nextConfig: LoveProjectConfig) => {
      const operation = saveQueue.current.then(async () => {
        setSaveState('saving')
        const response = await fetch(`/api/projects/${initialProject.id}/draft`, {
          method: 'PATCH',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ config: nextConfig, version: versionRef.current }),
        })
        const result = (await response.json()) as { version?: number; message?: string }
        if (!response.ok || !result.version) {
          throw new Error(result.message ?? '自动保存失败')
        }
        versionRef.current = result.version
        setVersion(result.version)
        setSaveState('saved')
        setMessage(null)
      })
      saveQueue.current = operation.catch(() => undefined)
      return operation
    },
    [initialProject.id],
  )

  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false
      return
    }
    setSaveState('saving')
    const timeout = window.setTimeout(() => {
      void persistDraft(config).catch((reason: unknown) => {
        setSaveState('error')
        setMessage(reason instanceof Error ? reason.message : '自动保存失败')
      })
    }, 700)
    return () => window.clearTimeout(timeout)
  }, [config, persistDraft])

  useEffect(() => {
    if (!shareUrl && typeof window !== 'undefined') {
      setShareUrl(new URL(`/s/${initialProject.publicSlug}`, window.location.origin).href)
    }
  }, [initialProject.publicSlug, shareUrl])

  const patchConfig = <K extends keyof LoveProjectConfig>(
    key: K,
    value: LoveProjectConfig[K],
  ) => setConfig((current) => ({ ...current, [key]: value }))

  const uploadPhotos = async (files: FileList | null) => {
    if (!files?.length) return
    setUploading(true)
    setMessage(null)
    try {
      for (const file of Array.from(files).slice(0, 9 - photos.length)) {
        const form = new FormData()
        form.set('file', file)
        const response = await fetch(`/api/projects/${initialProject.id}/assets`, {
          method: 'POST',
          body: form,
        })
        const asset = (await response.json()) as ResolvedLovePhoto & { message?: string }
        if (!response.ok) throw new Error(asset.message ?? '照片上传失败')
        setPhotos((current) => [...current, asset])
        setConfig((current) => ({
          ...current,
          gallery: [
            ...current.gallery,
            {
              assetId: asset.assetId,
              slotId: `photo-${String(current.gallery.length + 1).padStart(2, '0')}`,
              focalX: 0.5,
              focalY: 0.5,
            },
          ],
        }))
      }
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : '照片上传失败')
    } finally {
      setUploading(false)
    }
  }

  const deletePhoto = async (assetId: string) => {
    const response = await fetch(
      `/api/projects/${initialProject.id}/assets/${assetId}`,
      { method: 'DELETE' },
    )
    if (!response.ok) {
      const result = (await response.json().catch(() => null)) as { message?: string } | null
      setMessage(result?.message ?? '照片删除失败，请稍后重试')
      return
    }
    setPhotos((current) => current.filter((photo) => photo.assetId !== assetId))
    setConfig((current) => ({
      ...current,
      gallery: current.gallery
        .filter((photo) => photo.assetId !== assetId)
        .map((photo, index) => ({
          ...photo,
          slotId: `photo-${String(index + 1).padStart(2, '0')}`,
        })),
    }))
  }

  const publish = async () => {
    setMessage(null)
    try {
      await persistDraft(config)
    } catch (reason) {
      setSaveState('error')
      setMessage(reason instanceof Error ? reason.message : '草稿保存失败')
      return
    }
    const response = await fetch(`/api/projects/${initialProject.id}/publish`, {
      method: 'POST',
    })
    const result = (await response.json()) as { shareUrl?: string; message?: string }
    if (!response.ok || !result.shareUrl) {
      setMessage(result.message ?? '发布失败，请稍后重试')
      return
    }
    setPublished(true)
    setShareUrl(new URL(result.shareUrl, window.location.origin).href)
    setMessage('发布成功，现在可以把链接送给她 / 他了。')
  }

  const unpublish = async () => {
    const response = await fetch(`/api/projects/${initialProject.id}/publish`, {
      method: 'DELETE',
    })
    if (response.ok) {
      setPublished(false)
      setMessage('分享链接已撤下，重新发布后才会恢复访问。')
    }
  }

  const rotateCredentials = async () => {
    if (!window.confirm('旧的管理链接和恢复码将立即失效，确认重新生成吗？')) return
    const response = await fetch(`/api/projects/${initialProject.id}/credentials`, {
      method: 'POST',
    })
    const result = (await response.json()) as {
      claimUrl?: string
      recoveryCode?: string
      message?: string
    }
    if (!response.ok || !result.claimUrl || !result.recoveryCode) {
      setMessage(result.message ?? '管理凭证更新失败')
      return
    }
    setCredentials({
      claimUrl: new URL(result.claimUrl, window.location.origin).href,
      recoveryCode: result.recoveryCode,
    })
    setMessage('新的管理凭证已生成，请立即保存。')
  }

  const deleteProject = async () => {
    if (!window.confirm('这会撤下分享并删除全部照片，且无法恢复。确认删除吗？')) return
    const response = await fetch(`/api/projects/${initialProject.id}`, { method: 'DELETE' })
    if (!response.ok) {
      setMessage('删除失败，请稍后重试')
      return
    }
    window.location.assign('/?deleted=1')
  }

  const orderedPhotos = config.gallery
    .map((item) => photos.find((photo) => photo.assetId === item.assetId))
    .filter((photo): photo is ResolvedLovePhoto => Boolean(photo))

  const movePhoto = (index: number, offset: number) => {
    const target = index + offset
    if (target < 0 || target >= config.gallery.length) return
    setConfig((current) => {
      const gallery = [...current.gallery]
      ;[gallery[index], gallery[target]] = [gallery[target], gallery[index]]
      return {
        ...current,
        gallery: gallery.map((item, itemIndex) => ({
          ...item,
          slotId: `photo-${String(itemIndex + 1).padStart(2, '0')}`,
        })),
      }
    })
  }

  const share = async () => {
    if (!shareUrl) return
    if (navigator.share) {
      await navigator.share({
        title: config.identity.giftTitle,
        text: `${config.identity.senderName} 为你准备了一座花园`,
        url: shareUrl,
      })
      return
    }
    await navigator.clipboard.writeText(shareUrl)
    setMessage('分享链接已复制。')
  }

  const stepIndex = STEPS.findIndex((candidate) => candidate.id === step)
  const go = (offset: number) => setStep(STEPS[Math.max(0, Math.min(4, stepIndex + offset))].id)

  return (
    <main className="studio-page" data-interior-edit={editor.open}>
      <div className="studio-stage">
        <GardenStageClient
          config={renderConfig}
          mode="studio"
          interiorEditor={{
            open: editor.open,
            selectedInstanceId: editor.selectedInstanceId,
            transformMode: editor.transformMode,
            selectedPathPointIndex: editor.selectedPathPointIndex,
            onSelect: (id) => editor.setSelectedInstanceId(id || null),
            onPathPointSelect: editor.setSelectedPathPointIndex,
            onCommitTransform: editor.commitTransform,
            onCommitPathPoint: editor.commitPathPoint,
          }}
        />
      </div>

      <header className="studio-topbar">
        <Link href="/" className="studio-brand">LOVE</Link>
        <span>草稿 v{version}</span>
        <span className={`save-state save-state--${saveState}`}>
          {saveState === 'saved' ? <><Check size={13} /> 已保存</> : saveState === 'saving' ? '保存中…' : '保存失败'}
        </span>
        <Link href={`/preview/${initialProject.id}`} target="_blank">
          访客预览 <ExternalLink size={13} />
        </Link>
      </header>

      {!editor.open && (
        <aside className="studio-panel">
          <nav className="studio-steps" aria-label="定制步骤">
            {STEPS.map((item, index) => (
              <button
                key={item.id}
                type="button"
                data-active={item.id === step}
                onClick={() => setStep(item.id)}
              >
                <b>{index + 1}</b><span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="studio-panel__body">
            {step === 'identity' && (
              <StudioSection eyebrow="01 · IDENTITY" title="这座花园属于你们">
                <Field label="你的名字">
                  <input value={config.identity.senderName} maxLength={32} onChange={(event) => patchConfig('identity', { ...config.identity, senderName: event.target.value })} />
                </Field>
                <Field label="她 / 他的名字">
                  <input value={config.identity.recipientName} maxLength={32} onChange={(event) => patchConfig('identity', { ...config.identity, recipientName: event.target.value })} />
                </Field>
                <Field label="礼物标题">
                  <input value={config.identity.giftTitle} maxLength={64} onChange={(event) => patchConfig('identity', { ...config.identity, giftTitle: event.target.value })} />
                </Field>
              </StudioSection>
            )}

            {step === 'photos' && (
              <StudioSection eyebrow="02 · MEMORIES" title="把回忆挂进小屋">
                <p className="section-note">最多 9 张。上传后会自动纠正方向、压缩并移除拍摄信息。</p>
                <label className="photo-upload">
                  <ImagePlus size={22} />
                  <span>{uploading ? '正在处理照片…' : '选择照片'}</span>
                  <small>{photos.length} / 9</small>
                  <input type="file" accept="image/*" multiple disabled={uploading || photos.length >= 9} onChange={(event) => void uploadPhotos(event.target.files)} />
                </label>
                <div className="photo-grid">
                  {orderedPhotos.map((photo, index) => (
                    <figure key={photo.assetId}>
                      <img src={photo.url} alt={`回忆照片 ${index + 1}`} />
                      <figcaption>相框 {index + 1}</figcaption>
                      <button className="photo-delete" type="button" onClick={() => void deletePhoto(photo.assetId)} aria-label={`删除照片 ${index + 1}`}><Trash2 size={14} /></button>
                      <div className="photo-order"><button type="button" disabled={index === 0} onClick={() => movePhoto(index, -1)} aria-label="向前移动"><ChevronLeft size={12} /></button><button type="button" disabled={index === orderedPhotos.length - 1} onClick={() => movePhoto(index, 1)} aria-label="向后移动"><ChevronRight size={12} /></button></div>
                    </figure>
                  ))}
                </div>
              </StudioSection>
            )}

            {step === 'letter' && (
              <StudioSection eyebrow="03 · LETTER" title="写下想让她看到的话">
                <Field label="信件标题"><input value={config.letter.title} maxLength={48} onChange={(event) => patchConfig('letter', { ...config.letter, title: event.target.value })} /></Field>
                <Field label="称呼"><input value={config.letter.salutation} maxLength={48} onChange={(event) => patchConfig('letter', { ...config.letter, salutation: event.target.value })} /></Field>
                <Field label="正文"><textarea rows={11} value={config.letter.body} maxLength={1200} onChange={(event) => patchConfig('letter', { ...config.letter, body: event.target.value })} /></Field>
                <Field label="落款"><input value={config.letter.signature} maxLength={64} onChange={(event) => patchConfig('letter', { ...config.letter, signature: event.target.value })} /></Field>
              </StudioSection>
            )}

            {step === 'ambience' && (
              <StudioSection eyebrow="04 · ATMOSPHERE" title="选择你想留下的时刻">
                <Field label="时段"><select value={config.ambience.timeOfDay} onChange={(event) => patchConfig('ambience', { ...config.ambience, timeOfDay: event.target.value as LoveProjectConfig['ambience']['timeOfDay'] })}><option value="dawn">清晨</option><option value="noon">晴昼</option><option value="dusk">黄昏</option><option value="evening">星夜</option></select></Field>
                <Field label="天气"><select value={config.ambience.weatherPreset} onChange={(event) => patchConfig('ambience', { ...config.ambience, weatherPreset: event.target.value as LoveProjectConfig['ambience']['weatherPreset'] })}><option value="clear">晴朗</option><option value="soft-clouds">柔云</option><option value="overcast">阴天</option><option value="mist">薄雾</option></select></Field>
                <Field label="玫瑰花色"><select value={config.garden.rosePaletteId} onChange={(event) => patchConfig('garden', { ...config.garden, rosePaletteId: event.target.value as LoveProjectConfig['garden']['rosePaletteId'] })}><option value="mixed">混合花色</option><option value="deep-red">深红</option><option value="light-pink">柔粉</option><option value="snow-white">月白</option><option value="friendship-yellow">暖黄</option></select></Field>
                <Field label="天空告白（英文 / 数字）"><input value={config.ambience.skyMessage} maxLength={24} onChange={(event) => patchConfig('ambience', { ...config.ambience, skyMessage: event.target.value.toUpperCase() })} /></Field>
                <button className="secondary-action" type="button" onClick={() => editor.setOpen(true)}><LayoutTemplate size={17} /> 高级布置小屋</button>
              </StudioSection>
            )}

            {step === 'share' && (
              <StudioSection eyebrow="05 · SHARE" title="确认之后，把花园送出去">
                <p className="section-note">发布会生成一份不可变快照。之后继续编辑不会影响对方看到的版本，直到你再次发布。</p>
                <button className="publish-action" type="button" onClick={() => void publish()}><Send size={18} />{published ? '发布最新修改' : '发布花园'}</button>
                {published && shareUrl && (
                  <div className="share-box">
                    <img src={`/api/share/qr?url=${encodeURIComponent(shareUrl)}`} alt="分享链接二维码" />
                    <div><span>无需登录，打开即进入花园</span><code>{shareUrl}</code><div><button type="button" onClick={() => void navigator.clipboard.writeText(shareUrl)}><Copy size={14} />复制</button><button type="button" onClick={() => void share()}><Share2 size={14} />分享</button></div></div>
                  </div>
                )}
                {published && <button className="text-action" type="button" onClick={() => void unpublish()}>暂时撤下公开链接</button>}
                <details className="project-security">
                  <summary>安全与删除</summary>
                  <p>管理链接遗失或泄露时可立即轮换；删除项目会同时撤下公开链接和用户照片。</p>
                  <div><button type="button" onClick={() => void rotateCredentials()}>重置管理凭证</button><button type="button" onClick={() => void deleteProject()}>永久删除项目</button></div>
                  {credentials && <div className="credential-result"><span>新管理链接</span><code>{credentials.claimUrl}</code><span>新恢复码</span><code>{credentials.recoveryCode}</code></div>}
                </details>
              </StudioSection>
            )}
          </div>
          {message && <p className="studio-message" role="status">{message}</p>}
          <footer className="studio-panel__footer">
            <button type="button" disabled={stepIndex === 0} onClick={() => go(-1)}><ChevronLeft size={17} />上一步</button>
            <button type="button" disabled={stepIndex === 4} onClick={() => go(1)}>下一步<ChevronRight size={17} /></button>
          </footer>
        </aside>
      )}

      {editor.open && (
        <CottageInteriorEditorPanel
          instances={editor.instances}
          selectedInstanceId={editor.selectedInstanceId}
          transformMode={editor.transformMode}
          selectedPathPointIndex={editor.selectedPathPointIndex}
          persistenceError={editor.persistenceError}
          photoSourceMode="project-gallery"
          onClose={() => editor.setOpen(false)}
          onPreviewEntry={editor.previewEntry}
          onAdd={editor.addInstance}
          onSelect={editor.setSelectedInstanceId}
          onUpdate={editor.updateInstance}
          onDuplicate={editor.duplicateInstance}
          onDelete={editor.deleteInstance}
          onRestoreDefaults={editor.restoreDefaults}
          onTransformModeChange={editor.setTransformMode}
          onPathPointSelect={editor.setSelectedPathPointIndex}
        />
      )}
    </main>
  )
}

function StudioSection({ eyebrow, title, children }: { eyebrow: string; title: string; children: React.ReactNode }) {
  return <section className="studio-section"><p className="eyebrow">{eyebrow}</p><h1>{title}</h1>{children}</section>
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="studio-field"><span>{label}</span>{children}</label>
}
