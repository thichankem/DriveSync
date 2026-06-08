import React, { useEffect, useState } from 'react'
import type { DvcInfo } from '@shared/types'
import { AlertIcon, DatabaseIcon } from './icons'

interface Props {
  repoPath: string
  info: DvcInfo | null
  onChanged: () => void
  toast: (msg: string) => void
}

export function DvcPanel({ repoPath, info, onChanged, toast }: Props) {
  const [busy, setBusy] = useState('')
  const [remoteKind, setRemoteKind] = useState<'local' | 'gdrive'>('local')
  const [localPath, setLocalPath] = useState('')
  const [folderId, setFolderId] = useState('')
  const [log, setLog] = useState('')

  useEffect(() => {
    const off = window.api.sync.onProgress(() => {})
    return off
  }, [])

  if (!info) {
    return (
      <div className="empty-state">
        <p>Đang tải thông tin DVC…</p>
      </div>
    )
  }

  if (!info.installed) {
    return (
      <div className="dvc-panel">
        <div className="dvc-section">
          <span className="badge err">
            <AlertIcon size={11} /> Chưa cài DVC
          </span>
          <p style={{ marginTop: 12 }}>
            Chưa tìm thấy DVC trên máy. Cài bằng lệnh:
          </p>
          <pre style={{ background: 'var(--panel-alt)', padding: 12, borderRadius: 6 }}>
            pip install dvc dvc-gdrive
          </pre>
          <p className="field-hint">
            Gói <code>dvc-gdrive</code> cần thiết nếu muốn đẩy thẳng lên Google Drive qua API.
          </p>
        </div>
      </div>
    )
  }

  const wrap = async (key: string, fn: () => Promise<void>) => {
    setBusy(key)
    setLog('')
    try {
      await fn()
      onChanged()
    } finally {
      setBusy('')
    }
  }

  const doInit = () =>
    wrap('init', async () => {
      const r = await window.api.dvc.init(repoPath)
      if (!r.ok) toast('Khởi tạo DVC lỗi: ' + r.stderr)
      else toast('Đã khởi tạo DVC')
    })

  const doSetLocal = () =>
    wrap('remote', async () => {
      if (!localPath) return
      const r = await window.api.dvc.setRemoteLocal(repoPath, localPath)
      toast(r.ok ? 'Đã cấu hình remote (thư mục Google Drive)' : 'Lỗi: ' + r.stderr)
    })

  const doSetGdrive = () =>
    wrap('remote', async () => {
      if (!folderId.trim()) return
      const r = await window.api.dvc.setRemoteGdrive(repoPath, folderId.trim())
      toast(r.ok ? 'Đã cấu hình remote Google Drive (gdrive)' : 'Lỗi: ' + r.stderr)
    })

  const pickLocal = async () => {
    const p = await window.api.pickDirectory()
    if (p) setLocalPath(p)
  }

  const doAutoConnect = () =>
    wrap('auto', async () => {
      const r = await window.api.drive.autoConnect(repoPath)
      if (r.ok) {
        toast('Đã kết nối Google Drive: ' + r.path)
      } else if (r.needFolder) {
        // Không dò được Drive — cho chọn thủ công.
        const p = await window.api.pickDirectory()
        if (p) {
          const rr = await window.api.dvc.setRemoteLocal(repoPath, p)
          toast(rr.ok ? 'Đã kết nối thư mục: ' + p : 'Lỗi: ' + rr.stderr)
        } else {
          toast(r.message || 'Chưa kết nối được Google Drive')
        }
      } else {
        toast(r.message || 'Không kết nối được Google Drive')
      }
    })

  const doAdd = () =>
    wrap('add', async () => {
      const paths = await window.api.pickFiles(repoPath)
      if (!paths || paths.length === 0) return
      const r = await window.api.dvc.add(repoPath, paths)
      setLog(r.stdout + r.stderr)
      toast(r.ok ? `Đã track ${paths.length} mục bằng DVC` : 'Lỗi dvc add')
    })

  const doPush = () =>
    wrap('push', async () => {
      const r = await window.api.dvc.push(repoPath)
      setLog(r.stdout + r.stderr)
      toast(r.ok ? 'Đã đẩy data lên Drive' : 'Lỗi dvc push')
    })

  const doPull = () =>
    wrap('pull', async () => {
      const r = await window.api.dvc.pull(repoPath)
      setLog(r.stdout + r.stderr)
      toast(r.ok ? 'Đã tải data từ Drive' : 'Lỗi dvc pull')
    })

  const connected = info.initialized && info.remotes.length > 0

  return (
    <div className="dvc-panel" style={{ overflow: 'auto' }}>
      {/* CTA: kết nối Google Drive 1 chạm */}
      <div
        className="dvc-section"
        style={{
          background: 'var(--selected)',
          border: '1px solid var(--accent)',
          borderRadius: 8,
          padding: 14
        }}
      >
        <h3 style={{ marginTop: 0 }}>Kết nối Google Drive</h3>
        {connected ? (
          <span className="badge ok">Đã kết nối — sẵn sàng đồng bộ</span>
        ) : (
          <p style={{ margin: '0 0 10px' }}>
            Một chạm: tự khởi tạo DVC, dò tìm Google Drive trên máy và cấu hình nơi lưu data.
          </p>
        )}
        <button className="btn accent block" onClick={doAutoConnect} disabled={busy === 'auto'}>
          {busy === 'auto'
            ? 'Đang kết nối…'
            : connected
              ? 'Kết nối lại / đổi thư mục Google Drive'
              : '🔗 Kết nối Google Drive tự động'}
        </button>
      </div>

      <div className="dvc-section">
        <h3>
          <DatabaseIcon size={12} /> Trạng thái DVC
        </h3>
        {!info.initialized ? (
          <>
            <span className="badge warn">Chưa khởi tạo trong repo này</span>
            <p style={{ marginTop: 10 }}>
              DVC giúp quản lý phiên bản cho data &amp; file lớn mà không làm phình Git.
            </p>
            <button className="btn accent" onClick={doInit} disabled={busy === 'init'}>
              {busy === 'init' ? 'Đang khởi tạo…' : 'Khởi tạo DVC'}
            </button>
          </>
        ) : (
          <span className="badge ok">Đã khởi tạo</span>
        )}
      </div>

      {info.initialized && (
        <>
          <div className="dvc-section">
            <h3>Remote (nơi lưu data trên Google Drive)</h3>
            {info.remotes.length > 0 ? (
              info.remotes.map((r) => (
                <div className="remote-row" key={r.name}>
                  {r.default && <span className="badge ok">mặc định</span>}
                  <b>{r.name}</b>
                  <span style={{ color: 'var(--text-muted)' }}>{r.url}</span>
                </div>
              ))
            ) : (
              <p className="field-hint">Chưa cấu hình remote nào.</p>
            )}

            <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
              <button
                className={`btn ${remoteKind === 'local' ? 'accent' : ''}`}
                onClick={() => setRemoteKind('local')}
              >
                Thư mục Google Drive Desktop
              </button>
              <button
                className={`btn ${remoteKind === 'gdrive' ? 'accent' : ''}`}
                onClick={() => setRemoteKind('gdrive')}
              >
                Google Drive API (gdrive)
              </button>
            </div>

            {remoteKind === 'local' ? (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Thư mục lưu (trong Google Drive đã đồng bộ)</label>
                <div className="row">
                  <input type="text" value={localPath} readOnly placeholder="VD: G:\My Drive\dvc-storage" />
                  <button className="btn" onClick={pickLocal}>
                    Chọn…
                  </button>
                </div>
                <div className="field-hint">
                  Chọn một thư mục nằm trong Google Drive for Desktop. DVC ghi vào đó, Drive tự
                  upload lên cloud.
                </div>
                <button
                  className="btn accent"
                  style={{ marginTop: 8 }}
                  disabled={!localPath || busy === 'remote'}
                  onClick={doSetLocal}
                >
                  Lưu remote
                </button>
              </div>
            ) : (
              <div className="field" style={{ marginTop: 12 }}>
                <label>Google Drive Folder ID</label>
                <input
                  type="text"
                  value={folderId}
                  onChange={(e) => setFolderId(e.target.value)}
                  placeholder="VD: 1AbC...XyZ (lấy từ URL thư mục Drive)"
                />
                <div className="field-hint">
                  Cần cài <code>dvc-gdrive</code>. Lần push đầu sẽ mở trình duyệt để đăng nhập Google.
                </div>
                <button
                  className="btn accent"
                  style={{ marginTop: 8 }}
                  disabled={!folderId.trim() || busy === 'remote'}
                  onClick={doSetGdrive}
                >
                  Lưu remote
                </button>
              </div>
            )}
          </div>

          <div className="dvc-section">
            <h3>Quản lý data</h3>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button className="btn" onClick={doAdd} disabled={busy === 'add'}>
                {busy === 'add' ? 'Đang thêm…' : '+ Track file/thư mục'}
              </button>
              <button
                className="btn accent"
                onClick={doPush}
                disabled={busy === 'push' || info.remotes.length === 0}
              >
                {busy === 'push' ? 'Đang đẩy…' : '↑ Push lên Drive'}
              </button>
              <button
                className="btn"
                onClick={doPull}
                disabled={busy === 'pull' || info.remotes.length === 0}
              >
                {busy === 'pull' ? 'Đang tải…' : '↓ Pull từ Drive'}
              </button>
            </div>

            {info.status.length > 0 && (
              <div style={{ marginTop: 12 }}>
                <span className="badge warn">{info.status.length} mục cần push</span>
                <div style={{ marginTop: 6 }}>
                  {info.status.map((s) => (
                    <div className="remote-row" key={s.path}>
                      {s.path}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {log && (
            <div className="dvc-section">
              <h3>Nhật ký</h3>
              <pre
                style={{
                  background: 'var(--panel-alt)',
                  padding: 12,
                  borderRadius: 6,
                  maxHeight: 200,
                  overflow: 'auto',
                  whiteSpace: 'pre-wrap',
                  fontSize: 11
                }}
              >
                {log}
              </pre>
            </div>
          )}
        </>
      )}
    </div>
  )
}
