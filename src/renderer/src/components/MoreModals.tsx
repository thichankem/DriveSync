import React, { useEffect, useState } from 'react'
import { Modal } from './Modal'
import type { Identity, Remote, StashEntry } from '@shared/types'
import { TrashIcon } from './icons'

interface Base {
  repoPath: string
  onClose: () => void
  onChanged: () => void
  toast: (m: string) => void
}

/** Cài đặt repository: remote + tên/email Git. */
export function RepoSettingsModal({ repoPath, onClose, onChanged, toast }: Base) {
  const [remotes, setRemotes] = useState<Remote[]>([])
  const [identity, setIdentity] = useState<Identity>({ name: '', email: '' })
  const [newName, setNewName] = useState('origin')
  const [newUrl, setNewUrl] = useState('')

  const load = async () => {
    setRemotes(await window.api.git.remotes(repoPath))
    setIdentity(await window.api.git.getIdentity(repoPath))
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const addRemote = async () => {
    if (!newName.trim() || !newUrl.trim()) return
    const r = await window.api.git.addRemote(repoPath, newName.trim(), newUrl.trim())
    if (!r.ok) toast('Lỗi: ' + r.stderr)
    setNewUrl('')
    await load()
    onChanged()
  }
  const removeRemote = async (name: string) => {
    await window.api.git.removeRemote(repoPath, name)
    await load()
    onChanged()
  }
  const saveIdentity = async () => {
    await window.api.git.setIdentity(repoPath, identity.name, identity.email)
    toast('Đã lưu tên/email Git')
  }

  return (
    <Modal
      title="Cài đặt repository"
      onClose={onClose}
      footer={
        <button className="btn accent" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <div className="field">
        <label>Remote (kho Git từ xa, vd GitHub)</label>
        {remotes.length === 0 && <div className="field-hint">Chưa có remote.</div>}
        {remotes.map((r) => (
          <div className="remote-row" key={r.name} style={{ justifyContent: 'space-between' }}>
            <span>
              <b>{r.name}</b> — {r.url}
            </span>
            <button className="remove" style={{ opacity: 1 }} onClick={() => removeRemote(r.name)}>
              <TrashIcon />
            </button>
          </div>
        ))}
        <div className="row" style={{ marginTop: 8 }}>
          <input
            type="text"
            value={newName}
            style={{ maxWidth: 90 }}
            onChange={(e) => setNewName(e.target.value)}
          />
          <input
            type="text"
            value={newUrl}
            placeholder="https://github.com/user/repo.git"
            onChange={(e) => setNewUrl(e.target.value)}
          />
          <button className="btn" onClick={addRemote}>
            Thêm
          </button>
        </div>
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14 }}>
        <div className="field">
          <label>Tên hiển thị khi commit</label>
          <input
            type="text"
            value={identity.name}
            onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
          />
        </div>
        <div className="field">
          <label>Email khi commit</label>
          <input
            type="text"
            value={identity.email}
            onChange={(e) => setIdentity({ ...identity, email: e.target.value })}
          />
        </div>
        <button className="btn accent" onClick={saveIdentity}>
          Lưu tên/email
        </button>
      </div>
    </Modal>
  )
}

/** Quản lý Stash. */
export function StashModal({ repoPath, onClose, onChanged, toast }: Base) {
  const [list, setList] = useState<StashEntry[]>([])
  const [msg, setMsg] = useState('')
  const [untracked, setUntracked] = useState(true)

  const load = async () => setList(await window.api.git.stashList(repoPath))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const save = async () => {
    const r = await window.api.git.stashSave(repoPath, msg.trim(), untracked)
    if (!r.ok) toast('Lỗi: ' + r.stderr)
    setMsg('')
    await load()
    onChanged()
  }
  const act = async (fn: Promise<unknown>, label: string) => {
    await fn
    await load()
    onChanged()
    toast(label)
  }

  return (
    <Modal
      title="Stash (cất tạm thay đổi)"
      onClose={onClose}
      footer={
        <button className="btn accent" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <div className="field">
        <div className="row">
          <input
            type="text"
            value={msg}
            placeholder="Ghi chú stash (tuỳ chọn)"
            onChange={(e) => setMsg(e.target.value)}
          />
          <button className="btn accent" onClick={save}>
            Cất stash
          </button>
        </div>
        <label className="checkbox-field" style={{ marginTop: 8 }}>
          <input type="checkbox" checked={untracked} onChange={(e) => setUntracked(e.target.checked)} />
          Bao gồm cả file chưa theo dõi
        </label>
      </div>
      <div className="field">
        <label>Danh sách stash</label>
        {list.length === 0 && <div className="field-hint">Trống.</div>}
        {list.map((s) => (
          <div className="remote-row" key={s.index} style={{ justifyContent: 'space-between' }}>
            <span>{s.message}</span>
            <span style={{ display: 'flex', gap: 6 }}>
              <button
                className="btn"
                style={{ padding: '2px 8px' }}
                onClick={() => act(window.api.git.stashApply(repoPath, s.index), 'Đã apply')}
              >
                Apply
              </button>
              <button
                className="btn"
                style={{ padding: '2px 8px' }}
                onClick={() => act(window.api.git.stashPop(repoPath, s.index), 'Đã pop')}
              >
                Pop
              </button>
              <button
                className="btn"
                style={{ padding: '2px 8px', color: 'var(--red)' }}
                onClick={() => act(window.api.git.stashDrop(repoPath, s.index), 'Đã xoá')}
              >
                Xoá
              </button>
            </span>
          </div>
        ))}
      </div>
    </Modal>
  )
}

/** Quản lý Tags. */
export function TagsModal({ repoPath, onClose, onChanged, toast }: Base) {
  const [list, setList] = useState<string[]>([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')

  const load = async () => setList(await window.api.git.tags(repoPath))
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const create = async () => {
    if (!name.trim()) return
    const r = await window.api.git.createTag(repoPath, name.trim(), message.trim() || undefined)
    if (!r.ok) toast('Lỗi: ' + r.stderr)
    setName('')
    setMessage('')
    await load()
    onChanged()
  }
  const del = async (t: string) => {
    await window.api.git.deleteTag(repoPath, t)
    await load()
  }
  const pushAll = async () => {
    const r = await window.api.git.pushTags(repoPath)
    toast(r.ok ? 'Đã đẩy tags lên remote' : 'Lỗi: ' + r.stderr)
  }

  return (
    <Modal
      title="Tags (đánh dấu phiên bản)"
      onClose={onClose}
      footer={
        <>
          <button className="btn" onClick={pushAll}>
            Push tags
          </button>
          <button className="btn accent" onClick={onClose}>
            Đóng
          </button>
        </>
      }
    >
      <div className="field">
        <label>Tạo tag tại commit mới nhất (HEAD)</label>
        <div className="row">
          <input type="text" value={name} placeholder="v1.0.0" onChange={(e) => setName(e.target.value)} />
          <button className="btn accent" onClick={create}>
            Tạo
          </button>
        </div>
        <input
          type="text"
          style={{ marginTop: 8, width: '100%', padding: '8px 10px', border: '1px solid var(--border)', borderRadius: 6 }}
          value={message}
          placeholder="Mô tả tag (tuỳ chọn)"
          onChange={(e) => setMessage(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Tag hiện có</label>
        {list.length === 0 && <div className="field-hint">Chưa có tag.</div>}
        {list.map((t) => (
          <div className="remote-row" key={t} style={{ justifyContent: 'space-between' }}>
            <span>{t}</span>
            <button className="remove" style={{ opacity: 1 }} onClick={() => del(t)}>
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>
    </Modal>
  )
}
