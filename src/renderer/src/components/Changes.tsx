import React, { useMemo, useState } from 'react'
import type { FileChange, GitStatus } from '@shared/types'

interface UniqueFile {
  path: string
  type: FileChange['type']
  staged: boolean
}

const STATUS_CHAR: Record<FileChange['type'], string> = {
  modified: 'M',
  added: 'A',
  deleted: 'D',
  renamed: 'R',
  copied: 'C',
  untracked: 'U',
  conflicted: '!'
}

interface Props {
  repoPath: string
  status: GitStatus
  selectedPath: string | null
  onSelect: (path: string) => void
  onToggle: (path: string, staged: boolean) => void
  onToggleAll: (staged: boolean) => void
  onCommit: (summary: string, description: string, amend: boolean) => void
  onUndoLast: () => void
  onSnapshot: () => void
  onStash: () => void
  onDiscardAll: () => void
  busy: boolean
}

export function Changes({
  repoPath,
  status,
  selectedPath,
  onSelect,
  onToggle,
  onToggleAll,
  onCommit,
  onUndoLast,
  onSnapshot,
  onStash,
  onDiscardAll,
  busy
}: Props) {
  const [summary, setSummary] = useState('')
  const [description, setDescription] = useState('')
  const [amend, setAmend] = useState(false)

  const toggleAmend = async (on: boolean) => {
    setAmend(on)
    if (on) {
      const msg = await window.api.git.lastMessage(repoPath)
      const [first, ...rest] = msg.split('\n')
      setSummary(first || '')
      setDescription(rest.join('\n').trim())
    }
  }

  const files = useMemo<UniqueFile[]>(() => {
    const map = new Map<string, UniqueFile>()
    for (const f of status.files) {
      const ex = map.get(f.path)
      if (ex) {
        ex.staged = ex.staged || f.staged
      } else {
        map.set(f.path, { path: f.path, type: f.type, staged: f.staged })
      }
    }
    return [...map.values()].sort((a, b) => a.path.localeCompare(b.path))
  }, [status])

  const stagedCount = files.filter((f) => f.staged).length
  const allStaged = files.length > 0 && stagedCount === files.length

  const doCommit = () => {
    if (!summary.trim()) return
    if (!amend && stagedCount === 0) return
    onCommit(summary.trim(), description.trim(), amend)
    setSummary('')
    setDescription('')
    setAmend(false)
  }

  return (
    <>
      <div className="changes-header">
        <input
          type="checkbox"
          checked={allStaged}
          ref={(el) => {
            if (el) el.indeterminate = stagedCount > 0 && !allStaged
          }}
          onChange={(e) => onToggleAll(e.target.checked)}
        />
        <span>
          {files.length} file thay đổi
          {stagedCount > 0 && ` · ${stagedCount} đã chọn`}
        </span>
      </div>

      <div className="sidebar-scroll">
        {files.length === 0 && (
          <div className="empty-state" style={{ height: 'auto', padding: 30 }}>
            <p>Không có thay đổi nào.</p>
            <p style={{ fontSize: 12 }}>Mọi thứ đã được commit.</p>
          </div>
        )}
        {files.map((f) => (
          <div
            key={f.path}
            className={`file-row ${selectedPath === f.path ? 'selected' : ''}`}
            onClick={() => onSelect(f.path)}
          >
            <input
              type="checkbox"
              checked={f.staged}
              onClick={(e) => e.stopPropagation()}
              onChange={(e) => onToggle(f.path, e.target.checked)}
            />
            <span className="file-name" title={f.path}>
              {f.path}
            </span>
            <span className={`file-status st-${f.type}`}>{STATUS_CHAR[f.type]}</span>
          </div>
        ))}
      </div>

      <div className="commit-actions">
        <button className="mini-btn" onClick={onSnapshot} title="Tạo điểm khôi phục từ trạng thái hiện tại">
          💾 Lưu nhanh
        </button>
        <button className="mini-btn" onClick={onStash} disabled={files.length === 0} title="Cất tạm các thay đổi">
          Cất stash
        </button>
        <button
          className="mini-btn danger"
          onClick={onDiscardAll}
          disabled={files.length === 0}
          title="Bỏ tất cả thay đổi chưa commit"
        >
          Bỏ hết
        </button>
        <button className="mini-btn" onClick={onUndoLast} title="Hoàn tác commit gần nhất (giữ thay đổi)">
          Hoàn tác commit cuối
        </button>
      </div>

      <div className="commit-box">
        <input
          type="text"
          placeholder={
            amend
              ? 'Sửa nội dung commit gần nhất'
              : status.branch
                ? `Tóm tắt (commit vào ${status.branch})`
                : 'Tóm tắt commit'
          }
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
        />
        <textarea
          placeholder="Mô tả (tuỳ chọn)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
        <label className="checkbox-field" style={{ margin: '0 0 8px' }}>
          <input type="checkbox" checked={amend} onChange={(e) => toggleAmend(e.target.checked)} />
          Sửa commit gần nhất (amend)
        </label>
        <button
          className="btn primary"
          disabled={busy || !summary.trim() || (!amend && stagedCount === 0)}
          onClick={doCommit}
        >
          {busy
            ? 'Đang xử lý…'
            : amend
              ? 'Cập nhật commit (amend)'
              : `Commit ${stagedCount} file vào ${status.branch || 'branch'}`}
        </button>
      </div>
    </>
  )
}
