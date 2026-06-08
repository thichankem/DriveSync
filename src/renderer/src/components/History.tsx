import React from 'react'
import type { Commit } from '@shared/types'

interface Props {
  commits: Commit[]
  selected: string | null
  onSelect: (hash: string) => void
  onSearch: (query: string) => void
  onTimeMachine: () => void
  onSquash: () => void
  onCompare: () => void
}

export function History({
  commits,
  selected,
  onSelect,
  onSearch,
  onTimeMachine,
  onSquash,
  onCompare
}: Props) {
  return (
    <>
      <div className="history-toolbar">
        <input
          type="text"
          className="history-search"
          placeholder="🔍 Tìm trong lịch sử (nội dung / tác giả)…"
          onChange={(e) => onSearch(e.target.value)}
        />
        <div className="commit-actions" style={{ borderTop: 'none', padding: '6px 0 0' }}>
          <button className="mini-btn" onClick={onTimeMachine} title="Quay lại mọi trạng thái cũ">
            🕘 Quay lại quá khứ
          </button>
          <button className="mini-btn" onClick={onCompare}>
            ⚖️ So sánh nhánh
          </button>
          <button className="mini-btn" onClick={onSquash} title="Gộp các commit gần nhất">
            🔀 Gộp commit
          </button>
        </div>
      </div>
      <div className="sidebar-scroll">
        {commits.length === 0 && (
          <div className="empty-state" style={{ height: 'auto', padding: 30 }}>
            <p>Không có commit nào khớp.</p>
          </div>
        )}
        {commits.map((c) => (
        <div
          key={c.hash}
          className={`commit-row ${selected === c.hash ? 'selected' : ''}`}
          onClick={() => onSelect(c.hash)}
        >
          <div className="commit-subject">{c.subject}</div>
          <div className="commit-meta">
            {c.author} · {c.relativeDate} · {c.shortHash}
          </div>
        </div>
        ))}
      </div>
    </>
  )
}

export function CommitDetail({ commit }: { commit: Commit | null }) {
  if (!commit) {
    return (
      <div className="empty-state">
        <p>Chọn một commit để xem chi tiết</p>
      </div>
    )
  }
  return (
    <div style={{ padding: 20, overflow: 'auto' }}>
      <h2 style={{ marginTop: 0, fontSize: 16 }}>{commit.subject}</h2>
      {commit.body && (
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font)', color: 'var(--text)' }}>
          {commit.body}
        </pre>
      )}
      <div style={{ marginTop: 16, fontSize: 12, color: 'var(--text-muted)' }}>
        <div>
          <b>Tác giả:</b> {commit.author} &lt;{commit.email}&gt;
        </div>
        <div>
          <b>Ngày:</b> {commit.date} ({commit.relativeDate})
        </div>
        <div style={{ fontFamily: 'var(--mono)' }}>
          <b>Hash:</b> {commit.hash}
        </div>
      </div>
    </div>
  )
}
