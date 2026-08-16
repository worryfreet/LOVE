'use client'

import { useRouter } from 'next/navigation'
import { useState, type FormEvent } from 'react'
import { ArrowRight } from 'lucide-react'

export function RecoverForm() {
  const router = useRouter()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const recover = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    const response = await fetch('/api/recover', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ code }),
    })
    const result = (await response.json()) as { studioUrl?: string; message?: string }
    setSubmitting(false)
    if (!response.ok || !result.studioUrl) {
      setError(result.message ?? '恢复失败，请稍后重试')
      return
    }
    router.replace(result.studioUrl)
  }

  return (
    <form className="create-form recover-form" onSubmit={recover}>
      <p className="eyebrow">RECOVER</p>
      <h1>用恢复码找回花园</h1>
      <p className="create-form__lead">输入创建时保存的恢复码，我们会在这台设备上重新建立安全编辑会话。</p>
      <label><span>恢复码</span><input autoFocus required value={code} onChange={(event) => setCode(event.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX" /></label>
      {error && <p className="form-error" role="alert">{error}</p>}
      <button className="primary-action" type="submit" disabled={submitting}>{submitting ? '正在验证…' : '找回花园'}{!submitting && <ArrowRight size={17} />}</button>
    </form>
  )
}
