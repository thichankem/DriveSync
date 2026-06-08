import { contextBridge, ipcRenderer } from 'electron'
import type {
  Branch,
  Commit,
  CommandResult,
  CreateRepoOptions,
  DriveAccount,
  DvcInfo,
  FileChange,
  FileDiff,
  GitStatus,
  Identity,
  Remote,
  Repo,
  RepoState,
  StashEntry,
  ReflogEntry,
  CompareResult,
  SyncResult,
  SyncStep
} from '@shared/types'

const api = {
  // Hệ thống
  pickDirectory: (): Promise<string | null> => ipcRenderer.invoke('dialog:pickDirectory'),
  pickFiles: (defaultPath?: string): Promise<string[] | null> =>
    ipcRenderer.invoke('dialog:pickFiles', defaultPath),
  openPath: (p: string): Promise<string> => ipcRenderer.invoke('shell:openPath', p),

  // Repo
  repo: {
    list: (): Promise<Repo[]> => ipcRenderer.invoke('repo:list'),
    lastId: (): Promise<string | null> => ipcRenderer.invoke('repo:lastId'),
    touch: (id: string): Promise<void> => ipcRenderer.invoke('repo:touch', id),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('repo:remove', id),
    add: (path: string): Promise<{ repo?: Repo; error?: string }> =>
      ipcRenderer.invoke('repo:add', path),
    create: (opts: CreateRepoOptions): Promise<{ repo?: Repo; error?: string }> =>
      ipcRenderer.invoke('repo:create', opts),
    clone: (url: string, dest: string): Promise<{ repo?: Repo; error?: string }> =>
      ipcRenderer.invoke('repo:clone', { url, dest })
  },

  // Git
  git: {
    status: (cwd: string): Promise<GitStatus> => ipcRenderer.invoke('git:status', cwd),
    stage: (cwd: string, paths: string[]): Promise<CommandResult> =>
      ipcRenderer.invoke('git:stage', cwd, paths),
    unstage: (cwd: string, paths: string[]): Promise<CommandResult> =>
      ipcRenderer.invoke('git:unstage', cwd, paths),
    stageAll: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('git:stageAll', cwd),
    discard: (cwd: string, paths: string[]): Promise<void> =>
      ipcRenderer.invoke('git:discard', cwd, paths),
    commit: (cwd: string, msg: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:commit', cwd, msg),
    log: (cwd: string): Promise<Commit[]> => ipcRenderer.invoke('git:log', cwd),
    branches: (cwd: string): Promise<Branch[]> => ipcRenderer.invoke('git:branches', cwd),
    createBranch: (cwd: string, name: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:createBranch', cwd, name),
    checkout: (cwd: string, name: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:checkout', cwd, name),
    diff: (cwd: string, path: string, staged: boolean): Promise<FileDiff> =>
      ipcRenderer.invoke('git:diff', cwd, path, staged),
    // remote ops
    fetch: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('git:fetch', cwd),
    pull: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('git:pull', cwd),
    push: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('git:push', cwd),
    publishBranch: (cwd: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:publishBranch', cwd),
    // branch ops
    renameBranch: (cwd: string, o: string, n: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:renameBranch', cwd, o, n),
    deleteBranch: (cwd: string, n: string, force: boolean): Promise<CommandResult> =>
      ipcRenderer.invoke('git:deleteBranch', cwd, n, force),
    merge: (cwd: string, n: string): Promise<CommandResult> => ipcRenderer.invoke('git:merge', cwd, n),
    rebase: (cwd: string, n: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:rebase', cwd, n),
    // merge/rebase state
    repoState: (cwd: string): Promise<RepoState> => ipcRenderer.invoke('git:repoState', cwd),
    abortMerge: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('git:abortMerge', cwd),
    abortRebase: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('git:abortRebase', cwd),
    continueMerge: (cwd: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:continueMerge', cwd),
    continueRebase: (cwd: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:continueRebase', cwd),
    markResolved: (cwd: string, p: string[]): Promise<CommandResult> =>
      ipcRenderer.invoke('git:markResolved', cwd, p),
    // commit ops
    undoLast: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('git:undoLast', cwd),
    amend: (cwd: string, m: string): Promise<CommandResult> => ipcRenderer.invoke('git:amend', cwd, m),
    lastMessage: (cwd: string): Promise<string> => ipcRenderer.invoke('git:lastMessage', cwd),
    revert: (cwd: string, h: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:revert', cwd, h),
    reset: (cwd: string, h: string, m: 'soft' | 'mixed' | 'hard'): Promise<CommandResult> =>
      ipcRenderer.invoke('git:reset', cwd, h, m),
    checkoutCommit: (cwd: string, h: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:checkoutCommit', cwd, h),
    branchAt: (cwd: string, n: string, r: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:branchAt', cwd, n, r),
    cherryPick: (cwd: string, h: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:cherryPick', cwd, h),
    commitFiles: (cwd: string, h: string): Promise<FileChange[]> =>
      ipcRenderer.invoke('git:commitFiles', cwd, h),
    commitFileDiff: (cwd: string, h: string, p: string): Promise<FileDiff> =>
      ipcRenderer.invoke('git:commitFileDiff', cwd, h, p),
    // tags
    tags: (cwd: string): Promise<string[]> => ipcRenderer.invoke('git:tags', cwd),
    createTag: (cwd: string, n: string, m?: string, r?: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:createTag', cwd, n, m, r),
    deleteTag: (cwd: string, n: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:deleteTag', cwd, n),
    pushTags: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('git:pushTags', cwd),
    // remotes
    remotes: (cwd: string): Promise<Remote[]> => ipcRenderer.invoke('git:remotes', cwd),
    addRemote: (cwd: string, n: string, u: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:addRemote', cwd, n, u),
    removeRemote: (cwd: string, n: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:removeRemote', cwd, n),
    setRemoteUrl: (cwd: string, n: string, u: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:setRemoteUrl', cwd, n, u),
    // identity
    getIdentity: (cwd: string): Promise<Identity> => ipcRenderer.invoke('git:getIdentity', cwd),
    setIdentity: (cwd: string, n: string, em: string): Promise<void> =>
      ipcRenderer.invoke('git:setIdentity', cwd, n, em),
    // stash
    stashList: (cwd: string): Promise<StashEntry[]> => ipcRenderer.invoke('git:stashList', cwd),
    stashSave: (cwd: string, m: string, u: boolean): Promise<CommandResult> =>
      ipcRenderer.invoke('git:stashSave', cwd, m, u),
    stashApply: (cwd: string, i: number): Promise<CommandResult> =>
      ipcRenderer.invoke('git:stashApply', cwd, i),
    stashPop: (cwd: string, i: number): Promise<CommandResult> =>
      ipcRenderer.invoke('git:stashPop', cwd, i),
    stashDrop: (cwd: string, i: number): Promise<CommandResult> =>
      ipcRenderer.invoke('git:stashDrop', cwd, i),
    discardAll: (cwd: string): Promise<void> => ipcRenderer.invoke('git:discardAll', cwd),
    openTerminal: (cwd: string): Promise<void> => ipcRenderer.invoke('git:openTerminal', cwd),
    // Cỗ máy thời gian / quay lại quá khứ
    reflog: (cwd: string): Promise<ReflogEntry[]> => ipcRenderer.invoke('git:reflog', cwd),
    restoreFile: (cwd: string, ref: string, p: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:restoreFile', cwd, ref, p),
    snapshot: (cwd: string, m: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:snapshot', cwd, m),
    squashLast: (cwd: string, n: number, m: string): Promise<CommandResult> =>
      ipcRenderer.invoke('git:squashLast', cwd, n, m),
    forcePush: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('git:forcePush', cwd),
    pullMerge: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('git:pullMerge', cwd),
    searchLog: (cwd: string, q: string): Promise<Commit[]> =>
      ipcRenderer.invoke('git:searchLog', cwd, q),
    compare: (cwd: string, b: string, h: string): Promise<CompareResult> =>
      ipcRenderer.invoke('git:compare', cwd, b, h),
    diffBetween: (cwd: string, b: string, h: string, p: string): Promise<FileDiff> =>
      ipcRenderer.invoke('git:diffBetween', cwd, b, h, p),
    openFile: (cwd: string, p: string): Promise<string> =>
      ipcRenderer.invoke('git:openFile', cwd, p)
  },

  // Tài khoản Google Drive
  accounts: {
    list: (): Promise<DriveAccount[]> => ipcRenderer.invoke('acc:list'),
    add: (a: Omit<DriveAccount, 'id'>): Promise<DriveAccount> => ipcRenderer.invoke('acc:add', a),
    update: (a: DriveAccount): Promise<void> => ipcRenderer.invoke('acc:update', a),
    remove: (id: string): Promise<void> => ipcRenderer.invoke('acc:remove', id),
    active: (cwd: string): Promise<string | null> => ipcRenderer.invoke('acc:active', cwd),
    apply: (cwd: string, id: string): Promise<{ ok: boolean; message?: string }> =>
      ipcRenderer.invoke('acc:apply', cwd, id)
  },

  // DVC
  dvc: {
    info: (cwd: string): Promise<DvcInfo> => ipcRenderer.invoke('dvc:info', cwd),
    isInstalled: (): Promise<boolean> => ipcRenderer.invoke('dvc:isInstalled'),
    init: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('dvc:init', cwd),
    add: (cwd: string, paths: string[]): Promise<CommandResult> =>
      ipcRenderer.invoke('dvc:add', cwd, paths),
    setRemoteLocal: (cwd: string, p: string): Promise<CommandResult> =>
      ipcRenderer.invoke('dvc:setRemoteLocal', cwd, p),
    setRemoteGdrive: (cwd: string, id: string): Promise<CommandResult> =>
      ipcRenderer.invoke('dvc:setRemoteGdrive', cwd, id),
    push: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('dvc:push', cwd),
    pull: (cwd: string): Promise<CommandResult> => ipcRenderer.invoke('dvc:pull', cwd)
  },

  // Google Drive
  drive: {
    detect: (): Promise<string[]> => ipcRenderer.invoke('drive:detect'),
    autoConnect: (
      cwd: string
    ): Promise<{ ok: boolean; message?: string; path?: string; driveRoot?: string; needFolder?: boolean }> =>
      ipcRenderer.invoke('drive:autoConnect', cwd)
  },

  // Sync
  sync: {
    run: (cwd: string): Promise<SyncResult> => ipcRenderer.invoke('sync:run', cwd),
    onProgress: (cb: (data: { step: SyncStep; log?: string }) => void): (() => void) => {
      const listener = (_e: unknown, data: { step: SyncStep; log?: string }) => cb(data)
      ipcRenderer.on('sync:progress', listener)
      return () => ipcRenderer.removeListener('sync:progress', listener)
    }
  },

  onCloneProgress: (cb: (s: string) => void): (() => void) => {
    const listener = (_e: unknown, s: string) => cb(s)
    ipcRenderer.on('clone:progress', listener)
    return () => ipcRenderer.removeListener('clone:progress', listener)
  },

  onMenuAction: (cb: (action: string) => void): (() => void) => {
    const listener = (_e: unknown, action: string) => cb(action)
    ipcRenderer.on('menu:action', listener)
    return () => ipcRenderer.removeListener('menu:action', listener)
  }
}

contextBridge.exposeInMainWorld('api', api)

export type Api = typeof api
