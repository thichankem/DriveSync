import React, { useEffect, useState } from 'react'
import { Modal } from './Modal'
import { DiffView } from './Diff'
import type { Branch, CompareResult, FileChange, FileDiff } from '@shared/types'

interface Props {
  repoPath: string
  branches: Branch[]
  onClose: () => void
}

const STATUS_CHAR: Record<FileChange['type'], string> = {
  modified: 'M', added: 'A', deleted: 'D', renamed: 'R', copied: 'C', untracked: 'U', conflicted: '!'
}

export function CompareModal({ repoPath, branches, onClose }: Props) {
  const current = branches.find((b) => b.current)?.name || branches[0]?.name || ''
  const [base, setBase] = useState(branches.find((b) => !b.current)?.name || current)
  const [head, setHead] = useState(current)
  const [result, setResult] = useState<CompareResult | null>(null)
  const [sel, setSel] = useState<string | null>(null)
  const [diff, setDiff] = useState<FileDiff | null>(null)

  const load = async () => {
    setSel(null)
    setDiff(null)
    setResult(await window.api.git.compare(repoPath, base, head))
  }
  useEffect(() => {
    if (base && head) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, head])

  const pick = async (p: string) => {
    setSel(p)
    setDiff(await window.api.git.diffBetween(repoPath, base, head, p))
  }

  return (
    <Modal
      title="⚖️ So sánh hai nhánh"
      onClose={onClose}
      footer={
        <button className="btn accent" onClick={onClose}>
          Đóng
        </button>
      }
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <select value={base} onChange={(e) => setBase(e.target.value)} style={selStyle}>
          {branches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
        <span>→</span>
        <select value={head} onChange={(e) => setHead(e.target.value)} style={selStyle}>
          {branches.map((b) => (
            <option key={b.name} value={b.name}>
              {b.name}
            </option>
          ))}
        </select>
      </div>
      <p className="field-hint">
        Các commit có trong <b>{head}</b> mà <b>{base}</b> chưa có: <b>{result?.commits.length ?? 0}</b>.
        File khác nhau: <b>{result?.files.length ?? 0}</b>.
      </p>
      <div style={{ display: 'flex', gap: 10, height: '46vh' }}>
        <div style={{ width: 220, borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
          {result?.files.map((f) => (
            <div key={f.path} className={`file-row ${sel === f.path ? 'selected' : ''}`} onClick={() => pick(f.path)}>
              <span className="file-name" title={f.path}>{f.path}</span>
              <span className={`file-status st-${f.type}`}>{STATUS_CHAR[f.type]}</span>
            </div>
          ))}
          {result && result.files.length === 0 && <div className="field-hint" style={{ padding: 8 }}>Không có khác biệt.</div>}
        </div>
        <div style={{ flex: 1, minWidth: 0, overflow: 'auto', border: '1px solid var(--border)', borderRadius: 6 }}>
          <DiffView diff={diff} />
        </div>
      </div>
    </Modal>
  )
}

const selStyle: React.CSSProperties = {
  flex: 1,
  padding: '6px 8px',
  border: '1px solid var(--border)',
  borderRadius: 6,
  background: 'var(--panel)'
}
