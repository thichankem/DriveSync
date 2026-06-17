import React, { useCallback, useEffect, useRef, useState } from 'react'
import type {
  Branch,
  Commit,
  DriveAccount,
  DvcInfo,
  FileDiff,
  GitStatus,
  Repo,
  RepoState,
  SyncStep
} from '@shared/types'
import { Welcome } from './components/Welcome'
import { Changes } from './components/Changes'
import { History } from './components/History'
import { CommitView } from './components/CommitView'
import { DiffView } from './components/Diff'
import { DvcPanel } from './components/Dvc'
import { SyncModal } from './components/SyncModal'
import { CreateRepoModal, AddRepoModal, CloneRepoModal } from './components/RepoModals'
import { AccountsModal } from './components/AccountsModal'
import { RepoSettingsModal, StashModal, TagsModal } from './components/MoreModals'
import { GuideModal } from './components/GuideModal'
import { TimeMachineModal } from './components/TimeMachineModal'
import { CompareModal } from './components/CompareModal'
import { GraphView } from './components/GraphView'
import { ScheduleModal } from './components/ScheduleModal'
import { DepsBanner } from './components/DepsBanner'
import { Menu, Prompt, type MenuItem } from './components/ui'
import { AlertIcon, BranchIcon, ChevronDown, DatabaseIcon, PlusIcon, RepoIcon, SyncIcon, TrashIcon } from './components/icons'

type Tab = 'changes' | 'history' | 'graph' | 'dvc'
type ModalKind =
  | 'create'
  | 'add'
  | 'clone'
  | 'accounts'
  | 'settings'
  | 'stash'
  | 'tags'
  | 'guide'
  | 'timemachine'
  | 'compare'
  | 'schedule'
  | null
type BranchPick = 'switch' | 'merge' | 'rebase' | 'delete' | null

interface PromptCfg {
  title: string
  label: string
  defaultValue?: string
  placeholder?: string
  submitLabel?: string
  onSubmit: (value: string) => void
}

export default function App() {
  const [repos, setRepos] = useState<Repo[]>([])
  const [current, setCurrent] = useState<Repo | null>(null)
  const [tab, setTab] = useState<Tab>('changes')

  const [status, setStatus] = useState<GitStatus | null>(null)
  const [branches, setBranches] = useState<Branch[]>([])
  const [commits, setCommits] = useState<Commit[]>([])
  const [dvcInfo, setDvcInfo] = useState<DvcInfo | null>(null)
  const [repoState, setRepoState] = useState<RepoState>({ merging: false, rebasing: false })
  const [accounts, setAccounts] = useState<DriveAccount[]>([])
  const [activeAccId, setActiveAccId] = useState<string | null>(null)

  const [selFile, setSelFile] = useState<string | null>(null)
  const [diff, setDiff] = useState<FileDiff | null>(null)
  const [selCommit, setSelCommit] = useState<string | null>(null)
  const [graphSel, setGraphSel] = useState<Commit | null>(null)

  const [modal, setModal] = useState<ModalKind>(null)
  const [repoMenu, setRepoMenu] = useState(false)
  const [branchMenu, setBranchMenu] = useState(false)
  const [newBranch, setNewBranch] = useState('')
  const [branchPick, setBranchPick] = useState<BranchPick>(null)
  const dispatchRef = useRef<(action: string) => void>(() => {})
  const [prompt, setPrompt] = useState<PromptCfg | null>(null)

  const [busy, setBusy] = useState(false)
  const [toast, setToast] = useState('')
  const [tick, setTick] = useState(0)
  const [dragOver, setDragOver] = useState(false)

  const [syncOpen, setSyncOpen] = useState(false)
  const [syncRunning, setSyncRunning] = useState(false)
  const [syncSteps, setSyncSteps] = useState<SyncStep[]>([])

  const toastTimer = useRef<ReturnType<typeof setTimeout>>()
  const showToast = useCallback((msg: string) => {
    setToast(msg)
    clearTimeout(toastTimer.current)
    toastTimer.current = setTimeout(() => setToast(''), 3200)
  }, [])

  useEffect(() => {
    ;(async () => {
      const list = await window.api.repo.list()
      setRepos(list)
      setAccounts(await window.api.accounts.list())
      const lastId = await window.api.repo.lastId()
      const last = list.find((r) => r.id === lastId)
      if (last) openRepo(last)
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Nhận hành động từ menu native (File/View/Repository/Branch/Google Drive/Help)
  useEffect(() => window.api.onMenuAction((a) => dispatchRef.current(a)), [])

  const refresh = useCallback(async (repo: Repo) => {
    const [st, br, lg, dv, rs, acc] = await Promise.all([
      window.api.git.status(repo.path),
      window.api.git.branches(repo.path),
      window.api.git.log(repo.path),
      window.api.dvc.info(repo.path),
      window.api.git.repoState(repo.path),
      window.api.accounts.active(repo.path)
    ])
    setStatus(st)
    setBranches(br)
    setCommits(lg)
    setDvcInfo(dv)
    setRepoState(rs)
    setActiveAccId(acc)
    setTick((t) => t + 1)
    return st
  }, [])

  // Thông báo khi lịch tự động sao lưu chạy
  useEffect(
    () =>
      window.api.schedule.onRan((d) => {
        showToast('⏰ Tự động sao lưu: ' + d.message)
        if (current && d.repoPath === current.path) refresh(current)
      }),
    [current, refresh, showToast]
  )

  const openRepo = useCallback(
    async (repo: Repo) => {
      setCurrent(repo)
      setSelFile(null)
      setDiff(null)
      setSelCommit(null)
      setTab('changes')
      setRepoMenu(false)
      await window.api.repo.touch(repo.id)
      await refresh(repo)
    },
    [refresh]
  )

  const reloadRepos = useCallback(async () => setRepos(await window.api.repo.list()), [])

  const selectFile = useCallback(
    async (path: string) => {
      if (!current || !status) return
      setSelFile(path)
      const entries = status.files.filter((f) => f.path === path)
      const hasUnstaged = entries.some((e) => !e.staged)
      setDiff(await window.api.git.diff(current.path, path, !hasUnstaged))
    },
    [current, status]
  )

  const refreshKeepSelection = useCallback(async () => {
    if (!current) return
    const st = await refresh(current)
    if (selFile && st.files.some((f) => f.path === selFile)) {
      const entries = st.files.filter((f) => f.path === selFile)
      const hasUnstaged = entries.some((e) => !e.staged)
      setDiff(await window.api.git.diff(current.path, selFile, !hasUnstaged))
    } else {
      setSelFile(null)
      setDiff(null)
    }
  }, [current, refresh, selFile])

  // ---- Git: staging & commit ----
  const toggleFile = async (path: string, stage: boolean) => {
    if (!current) return
    if (stage) await window.api.git.stage(current.path, [path])
    else await window.api.git.unstage(current.path, [path])
    await refreshKeepSelection()
  }
  const toggleAll = async (stage: boolean) => {
    if (!current || !status) return
    const paths = [...new Set(status.files.map((f) => f.path))]
    if (stage) await window.api.git.stageAll(current.path)
    else await window.api.git.unstage(current.path, paths)
    await refreshKeepSelection()
  }
  const commit = async (summary: string, description: string, amend: boolean) => {
    if (!current) return
    setBusy(true)
    const msg = description ? `${summary}\n\n${description}` : summary
    const r = amend
      ? await window.api.git.amend(current.path, msg)
      : await window.api.git.commit(current.path, msg)
    setBusy(false)
    showToast(r.ok ? (amend ? 'Đã cập nhật commit' : 'Đã commit') : 'Lỗi: ' + (r.stderr || r.stdout))
    setSelFile(null)
    setDiff(null)
    await refresh(current)
  }

  // ---- helper chạy lệnh git + refresh ----
  const op = useCallback(
    async (fn: Promise<{ ok: boolean; stderr: string }>, okMsg: string) => {
      if (!current) return
      const r = await fn
      showToast(r.ok ? okMsg : 'Lỗi: ' + r.stderr)
      await refresh(current)
    },
    [current, refresh, showToast]
  )

  // ---- Branch ----
  const checkout = async (name: string) => {
    setBranchMenu(false)
    await op(window.api.git.checkout(current!.path, name), `Đã chuyển sang ${name}`)
  }
  const createBranchInline = async () => {
    if (!current || !newBranch.trim()) return
    const name = newBranch.trim()
    setNewBranch('')
    setBranchMenu(false)
    await op(window.api.git.createBranch(current.path, name), `Đã tạo branch ${name}`)
  }
  const doDeleteBranch = async (name: string) => {
    if (!current) return
    if (!confirm(`Xoá branch "${name}"?`)) return
    const r = await window.api.git.deleteBranch(current.path, name, false)
    if (!r.ok) {
      if (confirm(`Branch "${name}" chưa được merge. Xoá luôn (force)?`)) {
        await op(window.api.git.deleteBranch(current.path, name, true), `Đã xoá ${name}`)
      }
    } else {
      showToast(`Đã xoá ${name}`)
      await refresh(current)
    }
  }

  // ---- Remote ops ----
  const runRemote = async (fn: Promise<{ ok: boolean; stderr: string }>, okMsg: string) => {
    setBusy(true)
    await op(fn, okMsg)
    setBusy(false)
  }

  // ---- Sync ----
  const runSync = async () => {
    if (!current) return
    setSyncOpen(true)
    setSyncRunning(true)
    setSyncSteps([])
    const off = window.api.sync.onProgress(({ step }) => {
      setSyncSteps((prev) => {
        const idx = prev.findIndex((s) => s.key === step.key)
        if (idx >= 0) {
          const copy = [...prev]
          copy[idx] = step
          return copy
        }
        return [...prev, step]
      })
    })
    const res = await window.api.sync.run(current.path)
    off()
    setSyncSteps(res.steps)
    setSyncRunning(false)
    showToast(res.ok ? 'Đồng bộ hoàn tất' : 'Đồng bộ có lỗi — xem chi tiết')
    await refresh(current)
  }

  const onModalDone = async (repo: Repo) => {
    setModal(null)
    await reloadRepos()
    await openRepo(repo)
  }

  const applyAccount = async (id: string) => {
    if (!current) return
    setBusy(true)
    const r = await window.api.accounts.apply(current.path, id)
    setBusy(false)
    showToast(r.ok ? 'Đã chuyển tài khoản Google Drive' : 'Lỗi: ' + r.message)
    await refresh(current)
  }

  // ---- Lịch sử / quay lại quá khứ ----
  const searchHistory = async (q: string) => {
    if (!current) return
    setCommits(await window.api.git.searchLog(current.path, q))
  }
  const doSnapshot = () =>
    openPrompt({
      title: 'Lưu nhanh (điểm khôi phục)',
      label: 'Mô tả điểm khôi phục',
      defaultValue: 'Snapshot ' + new Date().toLocaleString('vi-VN'),
      submitLabel: 'Lưu',
      onSubmit: async (m) => {
        if (!current) return
        const r = await window.api.git.snapshot(current.path, m)
        showToast(r.ok ? 'Đã tạo điểm khôi phục ✓' : r.stderr || 'Không có gì để lưu')
        await refresh(current)
      }
    })
  const doSquash = () =>
    openPrompt({
      title: 'Gộp commit',
      label: 'Gộp bao nhiêu commit gần nhất?',
      defaultValue: '2',
      submitLabel: 'Tiếp',
      onSubmit: (cntStr) => {
        const cnt = parseInt(cntStr, 10)
        if (!cnt || cnt < 2) {
          showToast('Hãy nhập số ≥ 2')
          return
        }
        openPrompt({
          title: `Gộp ${cnt} commit gần nhất`,
          label: 'Mô tả cho commit gộp',
          submitLabel: 'Gộp',
          onSubmit: async (m) => {
            if (!current) return
            const r = await window.api.git.squashLast(current.path, cnt, m)
            showToast(r.ok ? `Đã gộp ${cnt} commit` : 'Lỗi: ' + r.stderr)
            await refresh(current)
          }
        })
      }
    })

  // ---- Kéo-thả file vào để stage ----
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setDragOver(false)
    if (!current) return
    const paths = Array.from(e.dataTransfer.files)
      .map((f) => (f as unknown as { path: string }).path)
      .filter(Boolean)
    if (!paths.length) return
    const r = await window.api.repo.importFiles(current.path, paths)
    showToast(`Đã thêm & stage ${r.added} file`)
    await refreshKeepSelection()
  }

  // ---- Điều phối hành động từ menu native ----
  const dispatch = (action: string) => {
    // Hành động không cần repo đang mở
    switch (action) {
      case 'new-repo':
        return setModal('create')
      case 'add-repo':
        return setModal('add')
      case 'clone-repo':
        return setModal('clone')
      case 'guide':
        return setModal('guide')
    }
    if (!current) {
      showToast('Hãy mở một repository trước')
      return
    }
    switch (action) {
      case 'view-changes':
        return setTab('changes')
      case 'view-history':
        return setTab('history')
      case 'view-graph':
        return setTab('graph')
      case 'view-dvc':
        return setTab('dvc')
      case 'schedule':
        return setModal('schedule')
      case 'refresh':
        void refresh(current)
        return
      case 'push':
        return runRemote(window.api.git.push(current.path), 'Đã push')
      case 'pull':
        return runRemote(window.api.git.pull(current.path), 'Đã pull')
      case 'fetch':
        return runRemote(window.api.git.fetch(current.path), 'Đã fetch')
      case 'sync':
        return void runSync()
      case 'open-explorer':
        return void window.api.openPath(current.path)
      case 'open-terminal':
        return void window.api.git.openTerminal(current.path)
      case 'stash':
        return setModal('stash')
      case 'tags':
        return setModal('tags')
      case 'repo-settings':
        return setModal('settings')
      case 'remove-repo':
        return void (async () => {
          await window.api.repo.remove(current.id)
          await reloadRepos()
          setCurrent(null)
        })()
      case 'new-branch':
        return openPrompt({
          title: 'Tạo branch mới',
          label: 'Tên branch',
          placeholder: 'feature/abc',
          submitLabel: 'Tạo',
          onSubmit: (n) => op(window.api.git.createBranch(current.path, n), `Đã tạo ${n}`)
        })
      case 'rename-branch':
        return openPrompt({
          title: 'Đổi tên branch hiện tại',
          label: 'Tên mới',
          defaultValue: status?.branch,
          submitLabel: 'Đổi tên',
          onSubmit: (n) => op(window.api.git.renameBranch(current.path, status!.branch, n), 'Đã đổi tên')
        })
      case 'delete-branch':
        return setBranchPick('delete')
      case 'switch-branch':
        return setBranchPick('switch')
      case 'merge':
        return setBranchPick('merge')
      case 'rebase':
        return setBranchPick('rebase')
      case 'publish':
        return runRemote(window.api.git.publishBranch(current.path), 'Đã publish branch')
      case 'dvc-push':
        return runRemote(window.api.dvc.push(current.path), 'Đã đẩy data lên Drive')
      case 'dvc-pull':
        return runRemote(window.api.dvc.pull(current.path), 'Đã tải data từ Drive')
      case 'timemachine':
        return setModal('timemachine')
      case 'compare':
        return setModal('compare')
      case 'snapshot':
        return doSnapshot()
      case 'squash':
        return doSquash()
      case 'force-push':
        return confirm('Đẩy ép buộc (force-with-lease)? Dùng khi đã sửa lịch sử và chắc chắn.')
          ? runRemote(window.api.git.forcePush(current.path), 'Đã force push')
          : undefined
      case 'pull-merge':
        return runRemote(window.api.git.pullMerge(current.path), 'Đã pull (merge)')
      case 'accounts':
        return setModal('accounts')
      case 'drive-connect':
        return void (async () => {
          const r = await window.api.drive.autoConnect(current.path)
          showToast(r.ok ? 'Đã kết nối Google Drive: ' + r.path : r.message || 'Không kết nối được')
          await refresh(current)
        })()
    }
  }
  dispatchRef.current = dispatch

  // ====== RENDER ======
  if (!current) {
    return (
      <div className="app">
        <DepsBanner />
        <Welcome
          repos={repos}
          onOpen={openRepo}
          onRemove={async (id) => {
            await window.api.repo.remove(id)
            await reloadRepos()
          }}
          onCreate={() => setModal('create')}
          onAdd={() => setModal('add')}
          onClone={() => setModal('clone')}
        />
        {renderModals()}
      </div>
    )
  }

  const changedCount = status ? new Set(status.files.map((f) => f.path)).size : 0
  const selectedCommitObj = commits.find((c) => c.hash === selCommit) || null
  const inConflict = repoState.merging || repoState.rebasing
  const activeAcc = accounts.find((a) => a.id === activeAccId)

  const pickBranchItems = (): MenuItem[] => {
    const others = branches.filter((b) => branchPick === 'switch' || !b.current)
    if (others.length === 0) return [{ label: '(không có branch phù hợp)', disabled: true }]
    return others.map((b) => ({
      label: b.name + (b.current ? ' (hiện tại)' : ''),
      onClick: () => {
        const name = b.name
        if (branchPick === 'switch') op(window.api.git.checkout(current.path, name), `Đã chuyển sang ${name}`)
        else if (branchPick === 'merge') op(window.api.git.merge(current.path, name), `Đã merge ${name}`)
        else if (branchPick === 'rebase') op(window.api.git.rebase(current.path, name), `Đã rebase lên ${name}`)
        else if (branchPick === 'delete') doDeleteBranch(name)
      }
    }))
  }

  return (
    <div className="app">
      <DepsBanner />
      {/* Toolbar */}
      <div className="toolbar">
        <button className="toolbar-btn toolbar-repo" onClick={() => setRepoMenu((v) => !v)}>
          <span className="label">
            <RepoIcon size={12} /> Repository hiện tại
          </span>
          <span className="value">
            {current.name} <ChevronDown size={12} />
          </span>
        </button>
        <button className="toolbar-btn toolbar-branch" onClick={() => setBranchMenu((v) => !v)}>
          <span className="label">
            <BranchIcon size={12} /> Branch
          </span>
          <span className="value">
            {status?.branch || '—'} <ChevronDown size={12} />
          </span>
        </button>
        <div className="toolbar-spacer" />
        <button className="toolbar-btn" onClick={() => runRemote(window.api.git.fetch(current.path), 'Đã fetch')}>
          <span className="label">↓ Lấy về</span>
          <span className="value">Fetch</span>
        </button>
        <button className="toolbar-btn toolbar-sync" onClick={runSync}>
          <span className="label">
            <SyncIcon size={12} /> Đồng bộ Drive
          </span>
          <span className="value">
            <span className="ahead-behind">
              {status && status.ahead > 0 && <span>↑{status.ahead}</span>}
              {status && status.behind > 0 && <span>↓{status.behind}</span>}
              {status && status.ahead === 0 && status.behind === 0 && <span>Sync</span>}
            </span>
          </span>
        </button>
      </div>

      {/* Dropdown repository (toolbar) */}
      {repoMenu && (
        <div className="dropdown" style={{ left: 0, top: 50 }}>
          {repos.map((r) => (
            <div key={r.id} className={`dropdown-item ${r.id === current.id ? 'active' : ''}`} onClick={() => openRepo(r)}>
              <RepoIcon /> {r.name}
            </div>
          ))}
          <div style={{ borderTop: '1px solid var(--border)' }}>
            <div className="dropdown-item" onClick={() => { setRepoMenu(false); setModal('create') }}>
              <PlusIcon /> Tạo repository mới
            </div>
            <div className="dropdown-item" onClick={() => { setRepoMenu(false); setModal('add') }}>
              <RepoIcon /> Thêm repo có sẵn
            </div>
            <div className="dropdown-item" onClick={() => { setRepoMenu(false); setModal('clone') }}>
              <RepoIcon /> Clone từ URL
            </div>
          </div>
        </div>
      )}

      {/* Dropdown branch (toolbar) */}
      {branchMenu && (
        <div className="dropdown" style={{ left: 230, top: 50 }}>
          <div className="dropdown-search">
            <input
              type="text"
              placeholder="Tên branch mới + Enter"
              value={newBranch}
              onChange={(e) => setNewBranch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && createBranchInline()}
            />
          </div>
          {branches.map((b) => (
            <div
              key={b.name}
              className={`dropdown-item ${b.current ? 'active' : ''}`}
              style={{ justifyContent: 'space-between' }}
            >
              <span
                style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0, overflow: 'hidden' }}
                onClick={() => checkout(b.name)}
              >
                <BranchIcon />
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {b.name}
                </span>
                {b.current && '✓'}
              </span>
              {!b.current && (
                <button
                  className="branch-del"
                  title={`Xoá branch "${b.name}"`}
                  onClick={(e) => {
                    e.stopPropagation()
                    doDeleteBranch(b.name)
                  }}
                >
                  <TrashIcon size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Menu chọn branch cho merge/rebase/delete/switch */}
      {branchPick && (
        <Menu items={pickBranchItems()} onClose={() => setBranchPick(null)} style={{ top: 60, left: 12 }} />
      )}

      {/* Banner xung đột (merge/rebase đang dở) */}
      {inConflict && (
        <div className="conflict-banner">
          <b>⚠ Đang {repoState.rebasing ? 'rebase' : 'merge'} — có thể có xung đột.</b>
          <span>Sửa file xung đột, tick để đánh dấu đã giải quyết, rồi bấm Tiếp tục.</span>
          <span className="spacer" />
          <button
            className="btn"
            style={{ padding: '4px 10px' }}
            onClick={() =>
              op(repoState.rebasing ? window.api.git.continueRebase(current.path) : window.api.git.continueMerge(current.path), 'Đã tiếp tục')
            }
          >
            Tiếp tục
          </button>
          <button
            className="btn"
            style={{ padding: '4px 10px', color: 'var(--red)' }}
            onClick={() =>
              op(repoState.rebasing ? window.api.git.abortRebase(current.path) : window.api.git.abortMerge(current.path), 'Đã huỷ')
            }
          >
            Huỷ
          </button>
        </div>
      )}

      {/* Body */}
      <div
        className="body"
        style={{ position: 'relative' }}
        onDragOver={(e) => {
          if (tab === 'changes') {
            e.preventDefault()
            if (!dragOver) setDragOver(true)
          }
        }}
        onDragLeave={(e) => {
          if (e.target === e.currentTarget) setDragOver(false)
        }}
        onDrop={handleDrop}
      >
        {dragOver && tab === 'changes' && (
          <div className="drop-overlay">📥 Thả file vào đây để thêm vào dự án &amp; stage</div>
        )}
        {status && !status.isRepo ? (
          <div className="empty-state" style={{ flex: 1 }}>
            <AlertIcon size={28} />
            <p>Không mở được repository này.</p>
            <p style={{ fontSize: 12 }}>
              Thư mục có thể đã bị di chuyển/xoá, hoặc không phải Git repo:
              <br />
              <code style={{ fontFamily: 'var(--mono)' }}>{current.path}</code>
            </p>
            <div style={{ display: 'flex', gap: 8 }}>
              <button className="btn accent" onClick={() => setCurrent(null)}>
                Về màn hình chính
              </button>
              <button
                className="btn"
                onClick={async () => {
                  await window.api.repo.remove(current.id)
                  await reloadRepos()
                  setCurrent(null)
                }}
              >
                Gỡ khỏi danh sách
              </button>
            </div>
          </div>
        ) : tab === 'dvc' ? (
          <>
            <div className="sidebar">
              {renderTabs()}
              <DvcSidebar info={dvcInfo} account={activeAcc?.label} />
            </div>
            <div className="main-content">
              <DvcPanel repoPath={current.path} info={dvcInfo} onChanged={() => refresh(current)} toast={showToast} />
            </div>
          </>
        ) : (
          <>
            <div className="sidebar">
              {renderTabs()}
              {tab === 'changes' && status && (
                <Changes
                  repoPath={current.path}
                  status={status}
                  selectedPath={selFile}
                  onSelect={selectFile}
                  onToggle={toggleFile}
                  onToggleAll={toggleAll}
                  onCommit={commit}
                  onUndoLast={() => op(window.api.git.undoLast(current.path), 'Đã hoàn tác commit cuối')}
                  onSnapshot={doSnapshot}
                  onStash={() => setModal('stash')}
                  onDiscardAll={() => confirm('Bỏ TẤT CẢ thay đổi chưa commit?') && window.api.git.discardAll(current.path).then(() => refresh(current))}
                  busy={busy}
                />
              )}
              {tab === 'history' && (
                <History
                  commits={commits}
                  selected={selCommit}
                  onSelect={setSelCommit}
                  onSearch={searchHistory}
                  onTimeMachine={() => setModal('timemachine')}
                  onSquash={doSquash}
                  onCompare={() => setModal('compare')}
                />
              )}
              {tab === 'graph' && (
                <GraphView
                  repoPath={current.path}
                  refreshKey={tick}
                  selected={selCommit}
                  onSelect={(c) => {
                    setSelCommit(c.hash)
                    setGraphSel({
                      hash: c.hash,
                      shortHash: c.shortHash,
                      author: c.author,
                      email: '',
                      date: c.relativeDate,
                      relativeDate: c.relativeDate,
                      subject: c.subject,
                      body: ''
                    })
                  }}
                />
              )}
            </div>

            <div className="main-content">
              {tab === 'changes' && (
                <>
                  {selFile && (
                    <div className="content-header">
                      <span>{selFile}</span>
                      <button
                        className="btn"
                        style={{ padding: '3px 10px' }}
                        onClick={async () => {
                          if (!confirm(`Huỷ mọi thay đổi của ${selFile}?`)) return
                          await window.api.git.discard(current.path, [selFile])
                          await refreshKeepSelection()
                        }}
                      >
                        Huỷ thay đổi
                      </button>
                    </div>
                  )}
                  <DiffView diff={diff} />
                </>
              )}
              {tab === 'history' && (
                <CommitView repoPath={current.path} commit={selectedCommitObj} onChanged={() => refresh(current)} toast={showToast} />
              )}
              {tab === 'graph' && (
                <CommitView repoPath={current.path} commit={graphSel} onChanged={() => refresh(current)} toast={showToast} />
              )}
            </div>
          </>
        )}
      </div>

      {syncOpen && <SyncModal steps={syncSteps} running={syncRunning} onClose={() => setSyncOpen(false)} />}
      {prompt && (
        <Prompt
          {...prompt}
          onCancel={() => setPrompt(null)}
          onSubmit={(v) => {
            setPrompt(null)
            prompt.onSubmit(v)
          }}
        />
      )}
      {toast && <div className="toast">{toast}</div>}
      {renderModals()}
    </div>
  )

  function openPrompt(cfg: PromptCfg) {
    setPrompt(cfg)
  }

  function renderTabs() {
    return (
      <div className="tabs">
        <button className={`tab ${tab === 'changes' ? 'active' : ''}`} onClick={() => setTab('changes')}>
          Thay đổi {changedCount > 0 && <span className="count">{changedCount}</span>}
        </button>
        <button className={`tab ${tab === 'history' ? 'active' : ''}`} onClick={() => setTab('history')}>
          Lịch sử
        </button>
        <button className={`tab ${tab === 'graph' ? 'active' : ''}`} onClick={() => setTab('graph')}>
          Đồ thị
        </button>
        <button className={`tab ${tab === 'dvc' ? 'active' : ''}`} onClick={() => setTab('dvc')}>
          DVC
        </button>
      </div>
    )
  }

  function renderModals() {
    if (modal === 'create') return <CreateRepoModal onClose={() => setModal(null)} onDone={onModalDone} />
    if (modal === 'add') return <AddRepoModal onClose={() => setModal(null)} onDone={onModalDone} />
    if (modal === 'clone') return <CloneRepoModal onClose={() => setModal(null)} onDone={onModalDone} />
    if (modal === 'accounts' && current)
      return (
        <AccountsModal
          repoPath={current.path}
          onClose={async () => { setModal(null); setAccounts(await window.api.accounts.list()); refresh(current) }}
          onApplied={() => refresh(current)}
          toast={showToast}
        />
      )
    if (modal === 'settings' && current)
      return <RepoSettingsModal repoPath={current.path} onClose={() => setModal(null)} onChanged={() => refresh(current)} toast={showToast} />
    if (modal === 'stash' && current)
      return <StashModal repoPath={current.path} onClose={() => setModal(null)} onChanged={() => refresh(current)} toast={showToast} />
    if (modal === 'tags' && current)
      return <TagsModal repoPath={current.path} onClose={() => setModal(null)} onChanged={() => refresh(current)} toast={showToast} />
    if (modal === 'guide') return <GuideModal onClose={() => setModal(null)} />
    if (modal === 'timemachine' && current)
      return <TimeMachineModal repoPath={current.path} onClose={() => setModal(null)} onChanged={() => refresh(current)} toast={showToast} />
    if (modal === 'compare' && current)
      return <CompareModal repoPath={current.path} branches={branches} onClose={() => setModal(null)} />
    if (modal === 'schedule' && current)
      return <ScheduleModal repoPath={current.path} onClose={() => setModal(null)} toast={showToast} />
    return null
  }
}

function DvcSidebar({ info, account }: { info: DvcInfo | null; account?: string }) {
  return (
    <div style={{ padding: 14 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
        <DatabaseIcon size={14} />
        <b>DVC + Google Drive</b>
      </div>
      {!info?.installed && <span className="badge err">Chưa cài DVC</span>}
      {info?.installed && !info.initialized && <span className="badge warn">Chưa khởi tạo</span>}
      {info?.initialized && (
        <>
          <span className="badge ok">Đã sẵn sàng</span>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 12 }}>
            {info.remotes.length} remote · {info.status.length} mục cần push
          </p>
        </>
      )}
      {account && (
        <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
          Tài khoản: <b>{account}</b>
        </p>
      )}
      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 16 }}>
        Dùng panel bên phải hoặc menu “Tài khoản Drive” để đổi tài khoản &amp; đẩy/tải data.
      </p>
    </div>
  )
}
