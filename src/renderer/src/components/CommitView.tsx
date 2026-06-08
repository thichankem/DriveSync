import React, { useEffect, useState } from 'react'
import type { Commit, FileChange, FileDiff } from '@shared/types'
import { DiffView } from './Diff'
import { Menu, Prompt } from './ui'

interface Props {
  repoPath: string
  commit: Commit | null
  onChanged: () => void
  toast: (m: string) => void
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

export function CommitView({ repoPath, commit, onChanged, toast }: Props) {
  const [files, setFiles] = useState<FileChange[]>([])
  const [sel, setSel] = useState<string | null>(null)
  const [diff, setDiff] = useState<FileDiff | null>(null)
  const [resetMenu, setResetMenu] = useState(false)
  const [prompt, setPrompt] = useState<null | 'branch' | 'tag'>(null)

  useEffect(() => {
    setSel(null)
    setDiff(null)
    if (commit) window.api.git.commitFiles(repoPath, commit.hash).then(setFiles)
    else setFiles([])
  }, [commit, repoPath])

  const selectFile = async (p: string) => {
    if (!commit) return
    setSel(p)
    setDiff(await window.api.git.commitFileDiff(repoPath, commit.hash, p))
  }

  if (!commit) {
    return (
      <div className="empty-state">
        <p>Chọn một commit để xem chi tiết &amp; thao tác</p>
      </div>
    )
  }

  const run = async (fn: Promise<{ ok: boolean; stderr: string }>, ok: string) => {
    const r = await fn
    toast(r.ok ? ok : 'Lỗi: ' + r.stderr)
    onChanged()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ fontWeight: 600, fontSize: 14 }}>{commit.subject}</div>
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 3 }}>
          {commit.author} · {commit.date} · {commit.shortHash}
        </div>
        {commit.body && (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'var(--font)', margin: '8px 0 0' }}>
            {commit.body}
          </pre>
        )}
        <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
          <button
            className="btn"
            style={{ padding: '4px 10px' }}
            onClick={() =>
              confirm('Tạo commit đảo ngược thay đổi của commit này?') &&
              run(window.api.git.revert(repoPath, commit.hash), 'Đã revert')
            }
          >
            Revert
          </button>
          <div style={{ position: 'relative' }}>
            <button className="btn" style={{ padding: '4px 10px' }} onClick={() => setResetMenu(true)}>
              Reset về đây ▾
            </button>
            {resetMenu && (
              <Menu
                onClose={() => setResetMenu(false)}
                style={{ top: 32, left: 0 }}
                items={[
                  {
                    label: 'Soft — giữ mọi thay đổi đã stage',
                    onClick: () => run(window.api.git.reset(repoPath, commit.hash, 'soft'), 'Đã reset (soft)')
                  },
                  {
                    label: 'Mixed — giữ thay đổi, bỏ stage',
                    onClick: () => run(window.api.git.reset(repoPath, commit.hash, 'mixed'), 'Đã reset (mixed)')
                  },
                  {
                    label: 'Hard — xoá hết thay đổi sau commit này',
                    danger: true,
                    onClick: () =>
                      confirm('CẢNH BÁO: Hard reset sẽ XOÁ mọi thay đổi sau commit này. Tiếp tục?') &&
                      run(window.api.git.reset(repoPath, commit.hash, 'hard'), 'Đã reset (hard)')
                  }
                ]}
              />
            )}
          </div>
          <button
            className="btn"
            style={{ padding: '4px 10px' }}
            onClick={() => run(window.api.git.checkoutCommit(repoPath, commit.hash), 'Đã checkout commit')}
          >
            Checkout
          </button>
          <button className="btn" style={{ padding: '4px 10px' }} onClick={() => setPrompt('branch')}>
            Tạo branch tại đây
          </button>
          <button
            className="btn"
            style={{ padding: '4px 10px' }}
            onClick={() => run(window.api.git.cherryPick(repoPath, commit.hash), 'Đã cherry-pick')}
          >
            Cherry-pick
          </button>
          <button className="btn" style={{ padding: '4px 10px' }} onClick={() => setPrompt('tag')}>
            Gắn tag
          </button>
          <button
            className="btn"
            style={{ padding: '4px 10px' }}
            onClick={() => {
              navigator.clipboard.writeText(commit.hash)
              toast('Đã sao chép mã commit')
            }}
          >
            📋 Sao chép mã
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        <div style={{ width: 240, borderRight: '1px solid var(--border)', overflowY: 'auto' }}>
          <div className="changes-header">{files.length} file thay đổi</div>
          {files.map((f) => (
            <div
              key={f.path}
              className={`file-row ${sel === f.path ? 'selected' : ''}`}
              onClick={() => selectFile(f.path)}
            >
              <span className="file-name" title={f.path}>
                {f.path}
              </span>
              <button
                className="restore-file"
                title="Khôi phục file này về đúng phiên bản tại commit này"
                onClick={(ev) => {
                  ev.stopPropagation()
                  if (!confirm(`Khôi phục "${f.path}" về phiên bản tại commit này?`)) return
                  run(window.api.git.restoreFile(repoPath, commit.hash, f.path), 'Đã khôi phục ' + f.path)
                }}
              >
                ⏪
              </button>
              <span className={`file-status st-${f.type}`}>{STATUS_CHAR[f.type]}</span>
            </div>
          ))}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <DiffView diff={diff} />
        </div>
      </div>

      {prompt === 'branch' && (
        <Prompt
          title="Tạo branch tại commit này"
          label="Tên branch"
          placeholder="feature/abc"
          submitLabel="Tạo"
          onCancel={() => setPrompt(null)}
          onSubmit={(name) => {
            setPrompt(null)
            run(window.api.git.branchAt(repoPath, name, commit.hash), 'Đã tạo branch')
          }}
        />
      )}
      {prompt === 'tag' && (
        <Prompt
          title="Gắn tag tại commit này"
          label="Tên tag"
          placeholder="v1.0.0"
          submitLabel="Tạo tag"
          onCancel={() => setPrompt(null)}
          onSubmit={(name) => {
            setPrompt(null)
            run(window.api.git.createTag(repoPath, name, undefined, commit.hash), 'Đã tạo tag')
          }}
        />
      )}
    </div>
  )
}
