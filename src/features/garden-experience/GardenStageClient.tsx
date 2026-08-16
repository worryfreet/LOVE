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
  { children: ReactNode },
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
      return (
        <div className="garden-fallback" role="alert">
          <span>LOVE</span>
          <h1>这座花园需要 WebGL 才能打开</h1>
          <p>请使用最新版微信、Safari、Chrome 或 Edge，并关闭浏览器的省电模式后再试。</p>
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
}: {
  config: LoveExperienceConfig
  mode: 'demo' | 'studio' | 'preview' | 'guest'
  interiorEditor?: GardenInteriorEditorRuntime
}) {
  return (
    <GardenErrorBoundary>
      <GardenExperience config={config} mode={mode} interiorEditor={interiorEditor} />
    </GardenErrorBoundary>
  )
}
