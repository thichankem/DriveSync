import React, { useEffect, useRef, useState } from 'react'
import type { DepsStatus } from '@shared/types'
import { Modal } from './Modal'
import { AlertIcon } from './icons'

/**
 * Banner kiểm tra phụ thuộc (git/dvc). Khi khởi động app, nếu thiếu công cụ
 * thì hiện thanh cảnh báo + nút "Cài đặt tự động" (winget/pip), kèm cửa sổ log.
 * Khi đủ điều kiện thì không hiển thị gì.
 */
export function DepsBanner() {
  const [deps, setDeps] = useState<DepsStatus | null>(null)
  const [open, setOpen] = useState(false)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(false)
  const [log, setLog] = useState('')
  const logRef = useRef<HTMLPreElement>(null)

  useEffect(() => {
    window.api.deps.check().then(setDeps)
  }, [])

  useEffect(() => {
    const off = window.api.deps.onProgress((s) => setLog((prev) => prev + s))
    return off
  }, [])

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight
  }, [log])

  // Đủ điều kiện hoặc chưa kiểm tra xong → không hiện banner.
  if (!deps || deps.ok) return null

  const missing: string[] = []
  if (!deps.git) missing.push('Git')
  if (!deps.dvc) missing.push('DVC')

  const startInstall = async () => {
    setOpen(true)
    setRunning(true)
    setDone(false)
    setLog('')
    const result = await window.api.deps.install()
    setDeps(result)
    setRunning(false)
    setDone(true)
  }

  return (
    <>
      <div className="deps-banner">
        <span className="deps-banner-icon"><AlertIcon size={14} /></span>
        <span className="deps-banner-text">
          Thiếu công cụ cần thiết: <b>{missing.join(', ')}</b>. App vẫn mở được nhưng
          chức năng đồng bộ sẽ không chạy cho đến khi cài đặt.
        </span>
        <button className="btn accent deps-banner-btn" onClick={startInstall}>
          Cài đặt tự động
        </button>
      </div>

      {open && (
        <Modal
          title="Cài đặt công cụ cần thiết"
          onClose={running ? () => {} : () => setOpen(false)}
          footer={
            <button className="btn accent" onClick={() => setOpen(false)} disabled={running}>
              {running ? 'Đang cài đặt…' : 'Đóng'}
            </button>
          }
        >
          <p style={{ marginTop: 0, color: 'var(--text-muted)' }}>
            Đang tải và cài <b>Git, Python, DVC</b> qua winget/pip. Quá trình có thể mở
            cửa sổ xác nhận của Windows (UAC) — hãy bấm <b>Yes</b>.
          </p>
          <pre
            ref={logRef}
            style={{
              maxHeight: 280,
              overflow: 'auto',
              background: 'var(--bg-inset, #1c2128)',
              padding: 10,
              borderRadius: 6,
              fontSize: 12,
              whiteSpace: 'pre-wrap',
              margin: 0
            }}
          >
            {log || 'Đang khởi động trình cài đặt…'}
          </pre>
          {done && (
            <p style={{ color: 'var(--green)', marginBottom: 0 }}>
              ✓ Hoàn tất. Hãy <b>đóng và mở lại app</b> để nhận các công cụ vừa cài.
            </p>
          )}
        </Modal>
      )}
    </>
  )
}
