// Các kiểu dữ liệu dùng chung giữa main process và renderer.

export interface Repo {
  id: string
  name: string
  path: string
  /** Thời điểm mở gần nhất (ms) để sắp xếp danh sách. */
  lastOpened: number
}

export type FileChangeType =
  | 'modified'
  | 'added'
  | 'deleted'
  | 'renamed'
  | 'untracked'
  | 'conflicted'
  | 'copied'

export interface FileChange {
  /** Đường dẫn tương đối so với gốc repo. */
  path: string
  /** Đường dẫn cũ khi đổi tên. */
  oldPath?: string
  type: FileChangeType
  /** File đã được stage (nằm trong index) hay chưa. */
  staged: boolean
}

export interface GitStatus {
  branch: string
  upstream?: string
  ahead: number
  behind: number
  files: FileChange[]
  isRepo: boolean
}

export interface Commit {
  hash: string
  shortHash: string
  author: string
  email: string
  date: string
  relativeDate: string
  subject: string
  body: string
}

export interface Branch {
  name: string
  current: boolean
  upstream?: string
}

export interface DiffLine {
  type: 'add' | 'del' | 'context' | 'hunk' | 'meta'
  content: string
  oldNum?: number
  newNum?: number
}

export interface FileDiff {
  path: string
  binary: boolean
  lines: DiffLine[]
}

export type DvcRemoteKind = 'local' | 'gdrive'

export interface DvcStatusItem {
  path: string
  state: string
}

export interface DvcInfo {
  initialized: boolean
  installed: boolean
  remotes: { name: string; url: string; default: boolean }[]
  /** Đường dẫn được DVC theo dõi nhưng chưa push, hoặc khác với cache. */
  status: DvcStatusItem[]
}

export interface CommandResult {
  ok: boolean
  code: number
  stdout: string
  stderr: string
}

export interface SyncStep {
  key: string
  label: string
  status: 'pending' | 'running' | 'done' | 'skipped' | 'error'
  detail?: string
}

export interface SyncResult {
  ok: boolean
  steps: SyncStep[]
}

export interface CreateRepoOptions {
  path: string
  name: string
  initGit: boolean
  initDvc: boolean
}

// ---------- Git nâng cao ----------
export interface Remote {
  name: string
  url: string
}

export interface StashEntry {
  index: number
  message: string
}

export interface Identity {
  name: string
  email: string
}

export interface RepoState {
  merging: boolean
  rebasing: boolean
}

// ---------- Tài khoản Google Drive ----------
export interface DriveAccount {
  id: string
  /** Nhãn hiển thị, vd: "Cá nhân — abc@gmail.com" */
  label: string
  type: DvcRemoteKind
  /** Cho type 'local': đường dẫn thư mục Google Drive. */
  path?: string
  /** Cho type 'gdrive': Folder ID trên Drive. */
  folderId?: string
}

export interface ReflogEntry {
  hash: string
  shortHash: string
  /** Bộ chọn reflog, vd HEAD@{2} */
  selector: string
  /** Mô tả thao tác, vd "commit", "reset: moving to ...", "checkout: ..." */
  action: string
  relativeDate: string
  date: string
}

export interface CompareResult {
  /** Commit có ở head mà chưa có ở base. */
  commits: Commit[]
  /** File khác nhau giữa base...head. */
  files: FileChange[]
}

export interface AutoConnectResult {
  ok: boolean
  message?: string
  path?: string
  driveRoot?: string
  needFolder?: boolean
}
