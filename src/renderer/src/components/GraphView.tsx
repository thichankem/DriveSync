import React, { useEffect, useMemo, useState } from 'react'
import type { GraphCommit } from '@shared/types'

const LW = 18 // bề rộng mỗi làn
const RH = 30 // chiều cao mỗi hàng
const R = 4.5 // bán kính chấm
const COLORS = ['#0969da', '#1a7f37', '#cf222e', '#9a6700', '#8250df', '#bf3989', '#1b7c83', '#d4a72c']
const color = (i: number) => COLORS[i % COLORS.length]

interface Row {
  c: GraphCommit
  col: number
}

function layout(commits: GraphCommit[]): { rows: Row[]; width: number } {
  const rows: Row[] = commits.map((c) => ({ c, col: 0 }))
  let lanes: (string | null)[] = []
  let maxWidth = 1

  const findOrAdd = (hash: string) => {
    let i = lanes.indexOf(hash)
    if (i !== -1) return i
    i = lanes.indexOf(null)
    if (i === -1) {
      i = lanes.length
      lanes.push(hash)
    } else lanes[i] = hash
    return i
  }

  for (let i = 0; i < commits.length; i++) {
    const c = commits[i]
    let col = lanes.indexOf(c.hash)
    if (col === -1) col = findOrAdd(c.hash)
    rows[i].col = col

    // các làn khác cũng chờ commit này -> hợp nhất
    for (let l = 0; l < lanes.length; l++) if (l !== col && lanes[l] === c.hash) lanes[l] = null

    if (c.parents.length === 0) {
      lanes[col] = null
    } else {
      lanes[col] = c.parents[0]
      for (let p = 1; p < c.parents.length; p++) findOrAdd(c.parents[p])
    }
    while (lanes.length && lanes[lanes.length - 1] === null) lanes.pop()
    maxWidth = Math.max(maxWidth, lanes.length, col + 1)
  }
  return { rows, width: maxWidth }
}

interface Props {
  repoPath: string
  refreshKey: number
  selected: string | null
  onSelect: (commit: GraphCommit) => void
}

export function GraphView({ repoPath, refreshKey, selected, onSelect }: Props) {
  const [commits, setCommits] = useState<GraphCommit[]>([])

  useEffect(() => {
    window.api.git.graphLog(repoPath).then(setCommits)
  }, [repoPath, refreshKey])

  const { rows, width } = useMemo(() => layout(commits), [commits])
  const indexOf = useMemo(() => new Map(commits.map((c, i) => [c.hash, i])), [commits])
  const graphW = width * LW + LW

  if (commits.length === 0) {
    return (
      <div className="empty-state">
        <p>Chưa có commit nào để vẽ đồ thị.</p>
      </div>
    )
  }

  const x = (col: number) => col * LW + LW / 2
  const y = (row: number) => row * RH + RH / 2

  return (
    <div style={{ overflow: 'auto', height: '100%' }}>
      <div style={{ position: 'relative', minHeight: rows.length * RH }}>
        <svg
          width={graphW}
          height={rows.length * RH}
          style={{ position: 'absolute', left: 0, top: 0, pointerEvents: 'none' }}
        >
          {/* các đường nối tới commit cha */}
          {rows.map((r) =>
            r.c.parents.map((p) => {
              const pi = indexOf.get(p)
              if (pi === undefined) return null
              const pc = rows[pi].col
              const x1 = x(r.col)
              const y1 = y(rows.indexOf(r))
              const x2 = x(pc)
              const y2 = y(pi)
              const col = color(Math.min(r.col, pc))
              const d = `M ${x1} ${y1} C ${x1} ${(y1 + y2) / 2}, ${x2} ${(y1 + y2) / 2}, ${x2} ${y2}`
              return <path key={r.c.hash + p} d={d} stroke={col} strokeWidth={1.6} fill="none" />
            })
          )}
          {/* các chấm commit */}
          {rows.map((r, i) => (
            <circle
              key={r.c.hash}
              cx={x(r.col)}
              cy={y(i)}
              r={R}
              fill={color(r.col)}
              stroke={selected === r.c.hash ? '#1f2328' : '#fff'}
              strokeWidth={selected === r.c.hash ? 2.4 : 1.4}
            />
          ))}
        </svg>

        {/* danh sách commit bên phải đồ thị */}
        {rows.map((r, i) => (
          <div
            key={r.c.hash}
            className={`graph-row ${selected === r.c.hash ? 'selected' : ''}`}
            style={{ height: RH, paddingLeft: graphW + 6 }}
            onClick={() => onSelect(r.c)}
            title={r.c.subject}
          >
            <span className="graph-subject">
              {parseRefs(r.c.refs).map((ref, k) => (
                <span key={k} className={`ref-chip ${ref.kind}`}>
                  {ref.label}
                </span>
              ))}
              {r.c.subject}
            </span>
            <span className="graph-meta">
              {r.c.author} · {r.c.relativeDate} · {r.c.shortHash}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

function parseRefs(refs: string): { label: string; kind: string }[] {
  if (!refs) return []
  return refs
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      if (s.startsWith('tag:')) return { label: '🏷 ' + s.slice(4).trim(), kind: 'tag' }
      if (s.startsWith('HEAD ->')) return { label: '● ' + s.slice(7).trim(), kind: 'head' }
      if (s.startsWith('origin/')) return { label: s, kind: 'remote' }
      return { label: s, kind: 'branch' }
    })
}
