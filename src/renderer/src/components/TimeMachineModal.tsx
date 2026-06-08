import React, { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { Prompt } from './ui'
import type { ReflogEntry } from '@shared/types'

interface Props {
  repoPath: string
  onClose: () => void
  onChanged: () => void
  toast: (m: string) => void
}

/**
 * "Cỗ máy thời gian": liệt kê reflog — mọi trạng thái HEAD từng đi qua,
 * kể cả sau khi reset/rebase/amend/xoá commit. Cho phép quay lại an toàn.
 */
export function TimeMachineModal({ repoPath, onClose, onChanged, toast }: Props) {
  const [entries, setEntries] = useState<ReflogEntry[]>([])
  const [filter, setFilter] = useState('')
  const [branchFor, setBranchFor] = useState<string | null>(null)

  useEffect(() => {
    window.api.git.reflog(repoPath).then(setEntries)
  }, [repoPath])

  const goBack = async (e: ReflogEntry) => {
    const ok = confirm(
      `Quay toàn bộ dự án về trạng thái:\n\n"${e.action}"\n(${e.date})\n\n` +
        'Mọi thay đổi CHƯA commit sẽ bị mất. Bạn vẫn có thể quay lại lần nữa bằng chính cửa sổ này. Tiếp tục?'
    )
    if (!ok) return
    const r = await window.api.git.reset(repoPath, e.hash, 'hard')
    toast(r.ok ? 'Đã quay về: ' + e.action : 'Lỗi: ' + r.stderr)
    onChanged()
    window.api.git.reflog(repoPath).then(setEntries)
  }

  const filtered = entries.filter(
    (e) =>
      !filter ||
      e.action.toLowerCase().includes(filter.toLowerCase()) ||
      e.shortHash.includes(filter)
  )

  return (
    <Modal
      title="🕘 Cỗ máy thời gian — Quay lại quá khứ"
      onClose={onClose}
      footer={
        <button className="btn accent" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <p className="field-hint" style={{ marginBottom: 10 }}>
        Đây là lịch sử <b>mọi trạng thái</b> dự án đã đi qua (kể cả sau khi lỡ reset/xoá commit).
        Chọn một dòng để <b>quay về</b> hoặc <b>tạo branch</b> tại đó — gần như không bao giờ mất code.
      </p>
      <div className="field" style={{ marginBottom: 8 }}>
        <input
          type="text"
          placeholder="Lọc theo mô tả hoặc mã commit…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>
      <div style={{ maxHeight: '52vh', overflowY: 'auto' }}>
        {filtered.map((e, i) => (
          <div
            key={i}
            className="remote-row"
            style={{ justifyContent: 'space-between', borderBottom: '1px solid var(--border)', padding: '8px 0' }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{ fontFamily: 'var(--font)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {e.action}
              </div>
              <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
                {e.selector} · {e.shortHash} · {e.relativeDate} ({e.date})
              </div>
            </div>
            <span style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <button className="btn" style={{ padding: '3px 9px' }} onClick={() => goBack(e)}>
                Quay về đây
              </button>
              <button className="btn" style={{ padding: '3px 9px' }} onClick={() => setBranchFor(e.hash)}>
                Tạo branch
              </button>
            </span>
          </div>
        ))}
        {filtered.length === 0 && <div className="field-hint">Không có mục nào.</div>}
      </div>

      {branchFor && (
        <Prompt
          title="Tạo branch tại thời điểm này"
          label="Tên branch"
          placeholder="khoi-phuc-1"
          submitLabel="Tạo"
          onCancel={() => setBranchFor(null)}
          onSubmit={async (name) => {
            const ref = branchFor
            setBranchFor(null)
            const r = await window.api.git.branchAt(repoPath, name, ref)
            toast(r.ok ? 'Đã tạo branch ' + name : 'Lỗi: ' + r.stderr)
            onChanged()
          }}
        />
      )}
    </Modal>
  )
}
