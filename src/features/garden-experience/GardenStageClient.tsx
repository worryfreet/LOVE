'use client'

import dynamic from 'next/dynamic'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import type { LoveExperienceConfig } from '@/domain/loveProjectConfig'
import type { GardenInteriorEditorRuntime } from './GardenExperience'

const GardenExperience = dynamic(
  () => import('./GardenExperience').then((module) => module.GardenExperience),
  {
    ssr: false,
    loading: () => (
      <div className="garden-loading" role="status">
        <span>LOVE</span>
        <p>花园正在醒来</p>
      </div>
    ),
  },
)

class GardenErrorBoundary extends Component<
  { children: ReactNode; config: LoveExperienceConfig },
  { failed: boolean }
> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (process.env.NODE_ENV !== 'production') console.error(error, info)
  }

  render() {
    if (this.state.failed) {
      const { identity, letter, experience } = this.props.config.project
      return (
        <div className="garden-fallback" role="alert">
          <span>LOVE</span>
          <h1>{identity.recipientName || '亲爱的你'}，这份礼物仍然属于你</h1>
          <p>{identity.senderName || '爱你的人'}为你准备的花园暂时无法在这台设备上呈现。</p>
          <article>
            <h2>{letter.title}</h2>
            <p>{letter.salutation}</p>
            <p>{letter.body}</p>
            <strong>{letter.signature}</strong>
          </article>
          <p>{experience.endingMessage}</p>
          <button type="button" onClick={() => window.location.reload()}>重新打开</button>
        </div>
      )
    }
    return this.props.children
  }
}

export function GardenStageClient({
  config,
  mode,
  interiorEditor,
  experienceKey,
}: {
  config: LoveExperienceConfig
  mode: 'demo' | 'studio' | 'preview' | 'guest'
  interiorEditor?: GardenInteriorEditorRuntime
  experienceKey?: string
}) {
  return (
    <GardenErrorBoundary config={config}>
      <GardenExperience
        config={config}
        mode={mode}
        interiorEditor={interiorEditor}
        experienceKey={experienceKey}
      />
    </GardenErrorBoundary>
  )
}
