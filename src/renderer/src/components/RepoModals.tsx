import React, { useEffect, useState } from 'react'
import { Modal } from './Modal'
import type { Repo } from '@shared/types'

interface CommonProps {
  onClose: () => void
  onDone: (repo: Repo) => void
}

/** Tạo repository mới (git init + tuỳ chọn dvc init). */
export function CreateRepoModal({ onClose, onDone }: CommonProps) {
  const [name, setName] = useState('')
  const [path, setPath] = useState('')
  const [initDvc, setInitDvc] = useState(true)
  const [dvcAvailable, setDvcAvailable] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    window.api.dvc.isInstalled().then(setDvcAvailable)
  }, [])

  const pick = async () => {
    const p = await window.api.pickDirectory()
    if (p) setPath(p)
  }

  const submit = async () => {
    if (!name.trim() || !path) {
      setError('Vui lòng nhập tên và chọn thư mục cha.')
      return
    }
    setBusy(true)
    setError('')
    const res = await window.api.repo.create({
      path,
      name: name.trim(),
      initGit: true,
      initDvc: initDvc && dvcAvailable
    })
    setBusy(false)
    if (res.error) setError(res.error)
    else if (res.repo) onDone(res.repo)
  }

  return (
    <Modal
      title="Tạo repository mới"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn accent" onClick={submit} disabled={busy}>
            {busy ? 'Đang tạo…' : 'Tạo repository'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Tên dự án</label>
        <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="my-project" />
      </div>
      <div className="field">
        <label>Thư mục chứa</label>
        <div className="row">
          <input type="text" value={path} readOnly placeholder="Chọn thư mục…" />
          <button className="btn" onClick={pick}>
            Chọn…
          </button>
        </div>
        {path && name && <div className="field-hint">Sẽ tạo tại: {path}\{name}</div>}
      </div>
      <div className="checkbox-field">
        <input
          type="checkbox"
          id="initdvc"
          checked={initDvc && dvcAvailable}
          disabled={!dvcAvailable}
          onChange={(e) => setInitDvc(e.target.checked)}
        />
        <label htmlFor="initdvc" style={{ margin: 0 }}>
          Khởi tạo DVC để quản lý data/file lớn
          {!dvcAvailable && ' (chưa cài DVC)'}
        </label>
      </div>
      {error && <div className="error-text">{error}</div>}
    </Modal>
  )
}

/** Thêm repository đã có sẵn trên máy. */
export function AddRepoModal({ onClose, onDone }: CommonProps) {
  const [path, setPath] = useState('')
  const [error, setError] = useState('')

  const pick = async () => {
    const p = await window.api.pickDirectory()
    if (p) {
      setPath(p)
      setError('')
    }
  }
  const submit = async () => {
    if (!path) return
    const res = await window.api.repo.add(path)
    if (res.error) setError(res.error)
    else if (res.repo) onDone(res.repo)
  }

  return (
    <Modal
      title="Thêm repository có sẵn"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn accent" onClick={submit} disabled={!path}>
            Thêm
          </button>
        </>
      }
    >
      <div className="field">
        <label>Thư mục Git repository</label>
        <div className="row">
          <input type="text" value={path} readOnly placeholder="Chọn thư mục…" />
          <button className="btn" onClick={pick}>
            Chọn…
          </button>
        </div>
      </div>
      {error && <div className="error-text">{error}</div>}
    </Modal>
  )
}

/** Clone repository từ URL. */
export function CloneRepoModal({ onClose, onDone }: CommonProps) {
  const [url, setUrl] = useState('')
  const [dest, setDest] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState('')

  useEffect(() => window.api.onCloneProgress(setProgress), [])

  const pick = async () => {
    const p = await window.api.pickDirectory()
    if (p) setDest(p)
  }
  const submit = async () => {
    if (!url.trim() || !dest) {
      setError('Nhập URL và chọn thư mục đích.')
      return
    }
    setBusy(true)
    setError('')
    const folder = url.replace(/\.git$/, '').split('/').pop() || 'repo'
    const target = `${dest}\\${folder}`
    const res = await window.api.repo.clone(url.trim(), target)
    setBusy(false)
    if (res.error) setError(res.error)
    else if (res.repo) onDone(res.repo)
  }

  return (
    <Modal
      title="Clone repository"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={onClose}>
            Huỷ
          </button>
          <button className="btn accent" onClick={submit} disabled={busy}>
            {busy ? 'Đang clone…' : 'Clone'}
          </button>
        </>
      }
    >
      <div className="field">
        <label>URL repository</label>
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://github.com/user/repo.git"
        />
      </div>
      <div className="field">
        <label>Thư mục đích</label>
        <div className="row">
          <input type="text" value={dest} readOnly placeholder="Chọn thư mục…" />
          <button className="btn" onClick={pick}>
            Chọn…
          </button>
        </div>
      </div>
      {busy && progress && (
        <pre style={{ fontSize: 11, maxHeight: 80, overflow: 'auto', whiteSpace: 'pre-wrap' }}>
          {progress}
        </pre>
      )}
      {error && <div className="error-text">{error}</div>}
    </Modal>
  )
}
