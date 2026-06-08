import React, { useEffect, useState } from 'react'
import { Modal } from './Modal'
import type { DriveAccount, DvcRemoteKind } from '@shared/types'
import { CheckIcon, TrashIcon } from './icons'

interface Props {
  repoPath: string
  onClose: () => void
  onApplied: () => void
  toast: (msg: string) => void
}

export function AccountsModal({ repoPath, onClose, onApplied, toast }: Props) {
  const [accounts, setAccounts] = useState<DriveAccount[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  // form thêm mới
  const [label, setLabel] = useState('')
  const [type, setType] = useState<DvcRemoteKind>('local')
  const [path, setPath] = useState('')
  const [folderId, setFolderId] = useState('')

  const load = async () => {
    setAccounts(await window.api.accounts.list())
    setActiveId(await window.api.accounts.active(repoPath))
  }
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const pick = async () => {
    const p = await window.api.pickDirectory()
    if (p) setPath(p)
  }

  const add = async () => {
    if (!label.trim()) return toast('Nhập nhãn tài khoản')
    if (type === 'local' && !path) return toast('Chọn thư mục Google Drive')
    if (type === 'gdrive' && !folderId.trim()) return toast('Nhập Folder ID')
    await window.api.accounts.add({
      label: label.trim(),
      type,
      path: type === 'local' ? path : undefined,
      folderId: type === 'gdrive' ? folderId.trim() : undefined
    })
    setLabel('')
    setPath('')
    setFolderId('')
    await load()
    toast('Đã thêm tài khoản')
  }

  const apply = async (id: string) => {
    setBusy(true)
    const r = await window.api.accounts.apply(repoPath, id)
    setBusy(false)
    if (r.ok) {
      toast('Đã chuyển sang tài khoản này cho repo')
      await load()
      onApplied()
    } else {
      toast('Lỗi: ' + r.message)
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Xoá tài khoản này khỏi danh sách?')) return
    await window.api.accounts.remove(id)
    await load()
  }

  return (
    <Modal
      title="Tài khoản Google Drive"
      onClose={onClose}
      footer={
        <button className="btn accent" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <div className="field">
        <label>Tài khoản đã lưu — bấm để chuyển cho repo hiện tại</label>
        {accounts.length === 0 && <div className="field-hint">Chưa có tài khoản nào.</div>}
        {accounts.map((a) => (
          <div
            key={a.id}
            className="repo-item"
            style={{ border: '1px solid var(--border)', marginBottom: 6 }}
          >
            <div className="meta" onClick={() => !busy && apply(a.id)} style={{ cursor: 'pointer' }}>
              <b>
                {a.id === activeId && (
                  <span style={{ color: 'var(--green)' }}>
                    <CheckIcon size={12} />{' '}
                  </span>
                )}
                {a.label}
              </b>
              <small>
                {a.type === 'local' ? `📁 ${a.path}` : `☁️ gdrive://${a.folderId}`}
              </small>
            </div>
            {a.id !== activeId && (
              <button className="btn" style={{ padding: '4px 10px' }} disabled={busy} onClick={() => apply(a.id)}>
                Dùng
              </button>
            )}
            <button className="remove" onClick={() => remove(a.id)}>
              <TrashIcon />
            </button>
          </div>
        ))}
      </div>

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: 14, marginTop: 6 }}>
        <div className="field">
          <label>Thêm tài khoản mới</label>
          <input
            type="text"
            value={label}
            placeholder="Nhãn, vd: Cá nhân — abc@gmail.com"
            onChange={(e) => setLabel(e.target.value)}
          />
        </div>
        <div className="field">
          <div style={{ display: 'flex', gap: 8 }}>
            <button className={`btn ${type === 'local' ? 'accent' : ''}`} onClick={() => setType('local')}>
              Thư mục Drive Desktop
            </button>
            <button className={`btn ${type === 'gdrive' ? 'accent' : ''}`} onClick={() => setType('gdrive')}>
              Google Drive API
            </button>
          </div>
        </div>
        {type === 'local' ? (
          <div className="field">
            <label>Thư mục Google Drive của tài khoản này</label>
            <div className="row">
              <input type="text" value={path} readOnly placeholder="VD: G:\My Drive" />
              <button className="btn" onClick={pick}>
                Chọn…
              </button>
            </div>
            <div className="field-hint">
              Mỗi Gmail đăng nhập trong Google Drive for Desktop sẽ có ổ/thư mục riêng — chọn đúng
              thư mục của tài khoản đó.
            </div>
          </div>
        ) : (
          <div className="field">
            <label>Google Drive Folder ID</label>
            <input
              type="text"
              value={folderId}
              placeholder="Lấy từ URL thư mục Drive"
              onChange={(e) => setFolderId(e.target.value)}
            />
            <div className="field-hint">
              Mỗi tài khoản dùng file đăng nhập riêng. Lần push đầu sẽ mở trình duyệt để đăng nhập
              đúng Gmail. Cần cài <code>dvc-gdrive</code>.
            </div>
          </div>
        )}
        <button className="btn accent block" onClick={add}>
          + Thêm tài khoản
        </button>
      </div>
    </Modal>
  )
}
