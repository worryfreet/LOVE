'use client'

import Link from 'next/link'
import { useState, type FormEvent } from 'react'
import { ArrowRight, Check, Copy, Flower2 } from 'lucide-react'
import { DEFAULT_LOVE_PROJECT_CONFIG } from '@/domain/loveProjectConfig'

interface CreatedProject {
  projectId: string
  claimUrl: string
  recoveryCode: string
  studioUrl: string
}

export function CreateProjectForm() {
  const [senderName, setSenderName] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [giftTitle, setGiftTitle] = useState('为你种下的一座花园')
  const [created, setCreated] = useState<CreatedProject | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const create = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      const config = structuredClone(DEFAULT_LOVE_PROJECT_CONFIG)
      config.identity = { senderName, recipientName, giftTitle }
      config.letter.salutation = recipientName ? `亲爱的${recipientName}：` : '亲爱的：'
      config.letter.signature = senderName || config.letter.signature
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ config }),
      })
      const result = (await response.json()) as CreatedProject & { message?: string }
      if (!response.ok) throw new Error(result.message ?? '创建失败，请稍后重试')
      setCreated(result)
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : '创建失败，请稍后重试')
    } finally {
      setSubmitting(false)
    }
  }

  const copy = async (label: string, value: string) => {
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(null), 1_500)
  }

  if (created) {
    const claimUrl = typeof window === 'undefined'
      ? created.claimUrl
      : new URL(created.claimUrl, window.location.origin).href
    return (
      <section className="create-result" aria-labelledby="created-title">
        <div className="create-result__mark"><Check size={28} /></div>
        <p className="eyebrow">花园已经为你留好</p>
        <h1 id="created-title">先收好管理凭证</h1>
        <p>不需要注册账号。管理链接或恢复码是你以后继续编辑的钥匙，请保存到安全的地方。</p>
        <label>
          <span>私密管理链接</span>
          <button type="button" onClick={() => copy('link', claimUrl)}>
            <code>{claimUrl}</code>
            {copied === 'link' ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </label>
        <label>
          <span>恢复码</span>
          <button type="button" onClick={() => copy('code', created.recoveryCode)}>
            <code>{created.recoveryCode}</code>
            {copied === 'code' ? <Check size={16} /> : <Copy size={16} />}
          </button>
        </label>
        <Link className="primary-action" href={created.studioUrl}>
          进入创作工作台 <ArrowRight size={17} />
        </Link>
      </section>
    )
  }

  return (
    <form className="create-form" onSubmit={create}>
      <div className="create-form__mark"><Flower2 size={24} /></div>
      <p className="eyebrow">CREATE YOUR GARDEN</p>
      <h1>先告诉花园，这份礼物属于谁</h1>
      <p className="create-form__lead">三项内容就能开始。照片、情书和氛围，进入工作台后再慢慢完成。</p>
      <div className="create-form__names">
        <label>
          <span>你的名字</span>
          <input
            autoFocus
            required
            maxLength={32}
            value={senderName}
            onChange={(event) => setSenderName(event.target.value)}
            placeholder="例如：林屿"
          />
        </label>
        <label>
          <span>她 / 他的名字</span>
          <input
            required
            maxLength={32}
            value={recipientName}
            onChange={(event) => setRecipientName(event.target.value)}
            placeholder="例如：星遥"
          />
        </label>
      </div>
      <label>
        <span>礼物标题</span>
        <input
          required
          maxLength={64}
          value={giftTitle}
          onChange={(event) => setGiftTitle(event.target.value)}
        />
      </label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-action" type="submit" disabled={submitting}>
        {submitting ? '正在种下花园…' : '开始定制'}
        {!submitting && <ArrowRight size={17} />}
      </button>
    </form>
  )
}
