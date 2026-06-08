import React from 'react'
import type { FileDiff } from '@shared/types'

export function DiffView({ diff }: { diff: FileDiff | null }) {
  if (!diff) {
    return (
      <div className="empty-state">
        <p>Chọn một file để xem thay đổi</p>
      </div>
    )
  }
  if (diff.binary) {
    return (
      <div className="empty-state">
        <p>File nhị phân — không hiển thị được nội dung diff.</p>
        <p style={{ fontSize: 12 }}>Nên dùng DVC để quản lý loại file này.</p>
      </div>
    )
  }
  if (diff.lines.length === 0) {
    return (
      <div className="empty-state">
        <p>Không có thay đổi nội dung để hiển thị.</p>
      </div>
    )
  }

  return (
    <div className="diff">
      {diff.lines.map((l, i) => {
        if (l.type === 'meta') return null
        const cls =
          l.type === 'add'
            ? 'dl-add'
            : l.type === 'del'
              ? 'dl-del'
              : l.type === 'hunk'
                ? 'dl-hunk'
                : ''
        const sign = l.type === 'add' ? '+' : l.type === 'del' ? '-' : ' '
        return (
          <div className={`diff-line ${cls}`} key={i}>
            {l.type === 'hunk' ? (
              <div className="diff-content">{l.content}</div>
            ) : (
              <>
                <div className="diff-gutter">{l.oldNum ?? ''}</div>
                <div className="diff-gutter">{l.newNum ?? ''}</div>
                <div className="diff-content">
                  {sign}
                  {l.content}
                </div>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
