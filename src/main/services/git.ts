import { promises as fs } from 'fs'
import { join } from 'path'
import { run } from './exec'
import type {
  Branch,
  Commit,
  DiffLine,
  FileChange,
  FileChangeType,
  FileDiff,
  GitStatus,
  Identity,
  Remote,
  RepoState,
  StashEntry,
  ReflogEntry,
  CompareResult
} from '@shared/types'

const SEP = '' // unit separator để tách field trong git log
const REC = '' // record separator để tách commit

async function git(cwd: string, args: string[]) {
  return run('git', args, { cwd })
}

export async function isGitRepo(cwd: string): Promise<boolean> {
  const res = await git(cwd, ['rev-parse', '--is-inside-work-tree'])
  return res.ok && res.stdout.trim() === 'true'
}

function mapType(code: string): FileChangeType {
  switch (code) {
    case 'M':
      return 'modified'
    case 'A':
      return 'added'
    case 'D':
      return 'deleted'
    case 'R':
      return 'renamed'
    case 'C':
      return 'copied'
    case '?':
      return 'untracked'
    case 'U':
      return 'conflicted'
    default:
      return 'modified'
  }
}

export async function status(cwd: string): Promise<GitStatus> {
  if (!(await isGitRepo(cwd))) {
    return { branch: '', ahead: 0, behind: 0, files: [], isRepo: false }
  }

  const res = await git(cwd, ['status', '--porcelain=v1', '-z', '--branch'])
  const parts = res.stdout.split('\0')

  let branch = ''
  let upstream: string | undefined
  let ahead = 0
  let behind = 0
  const files: FileChange[] = []

  for (let i = 0; i < parts.length; i++) {
    const entry = parts[i]
    if (!entry) continue

    if (entry.startsWith('##')) {
      // Ví dụ: ## main...origin/main [ahead 1, behind 2]
      const info = entry.slice(2).trim()
      const m = info.match(/^(.+?)(?:\.\.\.(\S+))?(?:\s+\[(.+)\])?$/)
      if (m) {
        branch = m[1].replace(/\.\.\..*/, '').trim()
        upstream = m[2]
        const bracket = m[3]
        if (bracket) {
          const a = bracket.match(/ahead (\d+)/)
          const b = bracket.match(/behind (\d+)/)
          ahead = a ? parseInt(a[1], 10) : 0
          behind = b ? parseInt(b[1], 10) : 0
        }
      }
      continue
    }

    const x = entry[0]
    const y = entry[1]
    let path = entry.slice(3)
    let oldPath: string | undefined

    // Rename/copy: đường dẫn nguồn nằm ở phần tử kế tiếp.
    if (x === 'R' || x === 'C') {
      oldPath = parts[i + 1]
      i++
    }

    if (x === '?' && y === '?') {
      files.push({ path, type: 'untracked', staged: false })
      continue
    }

    const conflicted =
      x === 'U' || y === 'U' || (x === 'A' && y === 'A') || (x === 'D' && y === 'D')
    if (conflicted) {
      files.push({ path, type: 'conflicted', staged: false })
      continue
    }

    // Phần staged (từ X)
    if (x !== ' ' && x !== '?') {
      files.push({ path, oldPath, type: mapType(x), staged: true })
    }
    // Phần chưa staged (từ Y)
    if (y !== ' ' && y !== '?') {
      files.push({ path, oldPath, type: mapType(y), staged: false })
    }
  }

  return { branch, upstream, ahead, behind, files, isRepo: true }
}

export async function stage(cwd: string, paths: string[]) {
  if (paths.length === 0) return
  return git(cwd, ['add', '--', ...paths])
}

export async function stageAll(cwd: string) {
  return git(cwd, ['add', '-A'])
}

export async function unstage(cwd: string, paths: string[]) {
  if (paths.length === 0) return
  return git(cwd, ['reset', 'HEAD', '--', ...paths])
}

export async function discard(cwd: string, paths: string[]) {
  // Khôi phục file đã theo dõi và xoá file untracked.
  await git(cwd, ['checkout', '--', ...paths])
  await git(cwd, ['clean', '-fd', '--', ...paths])
}

export async function commit(cwd: string, message: string) {
  return git(cwd, ['commit', '-m', message])
}

export async function log(cwd: string, limit = 100): Promise<Commit[]> {
  const fmt = ['%H', '%h', '%an', '%ae', '%ad', '%ar', '%s', '%b'].join(SEP) + REC
  const res = await git(cwd, [
    'log',
    `--max-count=${limit}`,
    '--date=format:%Y-%m-%d %H:%M',
    `--pretty=format:${fmt}`
  ])
  if (!res.ok) return []
  return res.stdout
    .split(REC)
    .map((r) => r.replace(/^\n/, ''))
    .filter((r) => r.trim().length > 0)
    .map((rec) => {
      const f = rec.split(SEP)
      return {
        hash: f[0],
        shortHash: f[1],
        author: f[2],
        email: f[3],
        date: f[4],
        relativeDate: f[5],
        subject: f[6],
        body: (f[7] || '').trim()
      } as Commit
    })
}

export async function branches(cwd: string): Promise<Branch[]> {
  const res = await git(cwd, [
    'branch',
    '--format=%(HEAD)%00%(refname:short)%00%(upstream:short)'
  ])
  if (!res.ok) return []
  return res.stdout
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      const [head, name, upstream] = l.split('\0')
      return { name, current: head.trim() === '*', upstream: upstream || undefined }
    })
}

export async function createBranch(cwd: string, name: string) {
  return git(cwd, ['checkout', '-b', name])
}

export async function checkout(cwd: string, name: string) {
  return git(cwd, ['checkout', name])
}

function parseDiff(text: string): DiffLine[] {
  const lines: DiffLine[] = []
  let oldNum = 0
  let newNum = 0
  for (const raw of text.split('\n')) {
    if (raw.startsWith('diff ') || raw.startsWith('index ') ||
        raw.startsWith('--- ') || raw.startsWith('+++ ') ||
        raw.startsWith('new file') || raw.startsWith('deleted file') ||
        raw.startsWith('similarity') || raw.startsWith('rename ')) {
      lines.push({ type: 'meta', content: raw })
      continue
    }
    if (raw.startsWith('@@')) {
      const m = raw.match(/@@ -(\d+)(?:,\d+)? \+(\d+)(?:,\d+)? @@/)
      if (m) {
        oldNum = parseInt(m[1], 10)
        newNum = parseInt(m[2], 10)
      }
      lines.push({ type: 'hunk', content: raw })
      continue
    }
    if (raw.startsWith('+')) {
      lines.push({ type: 'add', content: raw.slice(1), newNum: newNum++ })
    } else if (raw.startsWith('-')) {
      lines.push({ type: 'del', content: raw.slice(1), oldNum: oldNum++ })
    } else {
      lines.push({ type: 'context', content: raw.slice(1), oldNum: oldNum++, newNum: newNum++ })
    }
  }
  return lines
}

export async function diff(cwd: string, path: string, staged: boolean): Promise<FileDiff> {
  const args = ['diff', '--no-color']
  if (staged) args.push('--cached')
  args.push('--', path)
  let res = await git(cwd, args)

  // File untracked: không có trong index, hiển thị toàn bộ là dòng thêm mới.
  if (res.ok && res.stdout.trim() === '' && !staged) {
    const untrackedDiff = await git(cwd, [
      'diff',
      '--no-color',
      '--no-index',
      '--',
      process.platform === 'win32' ? 'NUL' : '/dev/null',
      path
    ])
    // --no-index trả mã != 0 khi có khác biệt; vẫn dùng stdout.
    if (untrackedDiff.stdout.trim()) res = untrackedDiff
  }

  const binary = /Binary files .* differ/.test(res.stdout)
  return { path, binary, lines: binary ? [] : parseDiff(res.stdout) }
}

export async function pull(cwd: string, onData?: (s: string) => void) {
  return run('git', ['pull', '--rebase', '--autostash'], {
    cwd,
    onData: (c) => onData?.(c)
  })
}

export async function push(cwd: string, onData?: (s: string) => void) {
  // Nếu branch chưa có upstream, đặt upstream tự động.
  const st = await status(cwd)
  const args = st.upstream
    ? ['push']
    : ['push', '--set-upstream', 'origin', st.branch]
  return run('git', args, { cwd, onData: (c) => onData?.(c) })
}

export async function hasRemote(cwd: string): Promise<boolean> {
  const res = await git(cwd, ['remote'])
  return res.ok && res.stdout.trim().length > 0
}

export async function init(cwd: string) {
  await git(cwd, ['init'])
  // Đảm bảo có .gitignore cơ bản.
  const gi = join(cwd, '.gitignore')
  try {
    await fs.access(gi)
  } catch {
    await fs.writeFile(gi, 'node_modules/\n.DS_Store\n', 'utf-8')
  }
}

export async function clone(url: string, dest: string, onData?: (s: string) => void) {
  return run('git', ['clone', '--progress', url, dest], {
    onData: (c) => onData?.(c)
  })
}

export async function currentBranch(cwd: string): Promise<string> {
  const res = await git(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
  return res.stdout.trim()
}

// ---------- Đồng bộ với remote ----------
export async function fetch(cwd: string, onData?: (s: string) => void) {
  return run('git', ['fetch', '--all', '--prune'], { cwd, onData: (c) => onData?.(c) })
}

export async function publishBranch(cwd: string, onData?: (s: string) => void) {
  const br = await currentBranch(cwd)
  return run('git', ['push', '--set-upstream', 'origin', br], { cwd, onData: (c) => onData?.(c) })
}

// ---------- Branch nâng cao ----------
export async function renameBranch(cwd: string, oldName: string, newName: string) {
  return git(cwd, ['branch', '-m', oldName, newName])
}

export async function deleteBranch(cwd: string, name: string, force = false) {
  return git(cwd, ['branch', force ? '-D' : '-d', name])
}

export async function mergeBranch(cwd: string, name: string) {
  return git(cwd, ['merge', '--no-edit', name])
}

export async function rebaseOnto(cwd: string, name: string) {
  return git(cwd, ['rebase', name])
}

// ---------- Trạng thái merge/rebase + xử lý conflict ----------
async function gitDir(cwd: string): Promise<string> {
  const res = await git(cwd, ['rev-parse', '--absolute-git-dir'])
  return res.stdout.trim()
}

export async function repoState(cwd: string): Promise<RepoState> {
  try {
    const dir = await gitDir(cwd)
    const exists = async (p: string) => {
      try {
        await fs.access(join(dir, p))
        return true
      } catch {
        return false
      }
    }
    const merging = await exists('MERGE_HEAD')
    const rebasing = (await exists('rebase-merge')) || (await exists('rebase-apply'))
    return { merging, rebasing }
  } catch {
    return { merging: false, rebasing: false }
  }
}

export async function abortMerge(cwd: string) {
  return git(cwd, ['merge', '--abort'])
}
export async function abortRebase(cwd: string) {
  return git(cwd, ['rebase', '--abort'])
}
export async function continueRebase(cwd: string) {
  return run('git', ['rebase', '--continue'], { cwd, env: { GIT_EDITOR: 'true' } })
}
export async function continueMerge(cwd: string) {
  // Sau khi resolve, commit để hoàn tất merge.
  return run('git', ['commit', '--no-edit'], { cwd, env: { GIT_EDITOR: 'true' } })
}
export async function markResolved(cwd: string, paths: string[]) {
  return git(cwd, ['add', '--', ...paths])
}

// ---------- Commit nâng cao ----------
export async function undoLastCommit(cwd: string) {
  // Giữ lại thay đổi trong working tree (soft reset).
  return git(cwd, ['reset', '--soft', 'HEAD~1'])
}

export async function amendCommit(cwd: string, message: string) {
  return git(cwd, ['commit', '--amend', '-m', message])
}

export async function lastCommitMessage(cwd: string): Promise<string> {
  const res = await git(cwd, ['log', '-1', '--pretty=%B'])
  return res.stdout.trim()
}

export async function revertCommit(cwd: string, hash: string) {
  return run('git', ['revert', '--no-edit', hash], { cwd, env: { GIT_EDITOR: 'true' } })
}

export async function resetToCommit(cwd: string, hash: string, mode: 'soft' | 'mixed' | 'hard') {
  return git(cwd, ['reset', `--${mode}`, hash])
}

export async function checkoutCommit(cwd: string, hash: string) {
  return git(cwd, ['checkout', hash])
}

export async function createBranchAt(cwd: string, name: string, ref: string) {
  return git(cwd, ['checkout', '-b', name, ref])
}

export async function cherryPick(cwd: string, hash: string) {
  return run('git', ['cherry-pick', hash], { cwd, env: { GIT_EDITOR: 'true' } })
}

// Danh sách file thay đổi trong một commit
export async function commitFiles(cwd: string, hash: string): Promise<FileChange[]> {
  const res = await git(cwd, ['show', '--format=', '--name-status', '-z', hash])
  const parts = res.stdout.split('\0').filter((p) => p.length)
  const files: FileChange[] = []
  for (let i = 0; i < parts.length; i++) {
    const code = parts[i][0]
    if (code === 'R' || code === 'C') {
      const oldPath = parts[i + 1]
      const newPath = parts[i + 2]
      i += 2
      files.push({ path: newPath, oldPath, type: mapType(code), staged: true })
    } else {
      const path = parts[i + 1]
      i += 1
      files.push({ path, type: mapType(code), staged: true })
    }
  }
  return files
}

export async function commitFileDiff(cwd: string, hash: string, path: string): Promise<FileDiff> {
  const res = await git(cwd, ['show', '--format=', '--no-color', hash, '--', path])
  const binary = /Binary files .* differ/.test(res.stdout)
  return { path, binary, lines: binary ? [] : parseDiff(res.stdout) }
}

// ---------- Tags ----------
export async function tags(cwd: string): Promise<string[]> {
  const res = await git(cwd, ['tag', '--sort=-creatordate'])
  return res.stdout.split('\n').map((t) => t.trim()).filter(Boolean)
}
export async function createTag(cwd: string, name: string, message?: string, ref?: string) {
  const args = ['tag']
  if (message) args.push('-a', name, '-m', message)
  else args.push(name)
  if (ref) args.push(ref)
  return git(cwd, args)
}
export async function deleteTag(cwd: string, name: string) {
  return git(cwd, ['tag', '-d', name])
}
export async function pushTags(cwd: string, onData?: (s: string) => void) {
  return run('git', ['push', '--tags'], { cwd, onData: (c) => onData?.(c) })
}

// ---------- Remote ----------
export async function remotes(cwd: string): Promise<Remote[]> {
  const res = await git(cwd, ['remote', '-v'])
  const map = new Map<string, string>()
  for (const line of res.stdout.split('\n')) {
    const m = line.match(/^(\S+)\s+(\S+)\s+\(fetch\)/)
    if (m) map.set(m[1], m[2])
  }
  return [...map.entries()].map(([name, url]) => ({ name, url }))
}
export async function addRemote(cwd: string, name: string, url: string) {
  return git(cwd, ['remote', 'add', name, url])
}
export async function removeRemote(cwd: string, name: string) {
  return git(cwd, ['remote', 'remove', name])
}
export async function setRemoteUrl(cwd: string, name: string, url: string) {
  return git(cwd, ['remote', 'set-url', name, url])
}

// ---------- Identity (tên/email commit) ----------
export async function getIdentity(cwd: string): Promise<Identity> {
  const name = await git(cwd, ['config', 'user.name'])
  const email = await git(cwd, ['config', 'user.email'])
  return { name: name.stdout.trim(), email: email.stdout.trim() }
}
export async function setIdentity(cwd: string, name: string, email: string) {
  await git(cwd, ['config', 'user.name', name])
  await git(cwd, ['config', 'user.email', email])
}

// ---------- Stash ----------
export async function stashList(cwd: string): Promise<StashEntry[]> {
  const res = await git(cwd, ['stash', 'list', '--pretty=%gd|%s'])
  return res.stdout
    .split('\n')
    .filter(Boolean)
    .map((l, i) => {
      const [, msg] = l.split('|')
      return { index: i, message: msg || l }
    })
}
export async function stashSave(cwd: string, message: string, includeUntracked: boolean) {
  const args = ['stash', 'push']
  if (includeUntracked) args.push('-u')
  if (message) args.push('-m', message)
  return git(cwd, args)
}
export async function stashApply(cwd: string, index: number) {
  return git(cwd, ['stash', 'apply', `stash@{${index}}`])
}
export async function stashPop(cwd: string, index: number) {
  return git(cwd, ['stash', 'pop', `stash@{${index}}`])
}
export async function stashDrop(cwd: string, index: number) {
  return git(cwd, ['stash', 'drop', `stash@{${index}}`])
}

// ---------- Khác ----------
export async function discardAll(cwd: string) {
  await git(cwd, ['checkout', '--', '.'])
  await git(cwd, ['clean', '-fd'])
}

// ========== CỖ MÁY THỜI GIAN / QUAY LẠI QUÁ KHỨ ==========

/** Reflog: lịch sử mọi nơi HEAD từng trỏ tới — dùng để khôi phục sau khi lỡ tay. */
export async function reflog(cwd: string, limit = 200): Promise<ReflogEntry[]> {
  const fmt = ['%H', '%h', '%gd', '%gs', '%cr', '%cd'].join(SEP) + REC
  const res = await git(cwd, [
    'log',
    '-g',
    `--max-count=${limit}`,
    '--date=format:%Y-%m-%d %H:%M',
    `--pretty=format:${fmt}`
  ])
  if (!res.ok) return []
  return res.stdout
    .split(REC)
    .map((r) => r.replace(/^\n/, ''))
    .filter((r) => r.trim())
    .map((rec) => {
      const f = rec.split(SEP)
      return {
        hash: f[0],
        shortHash: f[1],
        selector: f[2],
        action: f[3],
        relativeDate: f[4],
        date: f[5]
      } as ReflogEntry
    })
}

/** Khôi phục 1 file về đúng nội dung tại một commit (ghi vào working tree + index). */
export async function restoreFileFrom(cwd: string, ref: string, path: string) {
  return git(cwd, ['checkout', ref, '--', path])
}

/** Lưu nhanh: stage tất cả rồi commit như một "điểm khôi phục". */
export async function snapshot(cwd: string, message: string) {
  await git(cwd, ['add', '-A'])
  const st = await status(cwd)
  if (st.files.length === 0) {
    return { ok: false, code: 1, stdout: '', stderr: 'Không có thay đổi nào để lưu.' }
  }
  return git(cwd, ['commit', '-m', message])
}

/** Gộp N commit gần nhất thành 1 (giữ nguyên nội dung, gộp lịch sử). */
export async function squashLast(cwd: string, count: number, message: string) {
  if (count < 2) return { ok: false, code: 1, stdout: '', stderr: 'Cần ít nhất 2 commit.' }
  const reset = await git(cwd, ['reset', '--soft', `HEAD~${count}`])
  if (!reset.ok) return reset
  return git(cwd, ['commit', '-m', message])
}

/** Force push an toàn (chỉ ghi đè nếu remote không có commit lạ). */
export async function forcePush(cwd: string, onData?: (s: string) => void) {
  return run('git', ['push', '--force-with-lease'], { cwd, onData: (c) => onData?.(c) })
}

/** Pull kiểu merge (không rebase). */
export async function pullMerge(cwd: string, onData?: (s: string) => void) {
  return run('git', ['pull', '--no-rebase'], { cwd, onData: (c) => onData?.(c) })
}

/** Tìm trong lịch sử theo nội dung commit hoặc tác giả. */
export async function searchLog(cwd: string, query: string, limit = 100): Promise<Commit[]> {
  if (!query.trim()) return log(cwd, limit)
  const fmt = ['%H', '%h', '%an', '%ae', '%ad', '%ar', '%s', '%b'].join(SEP) + REC
  const res = await git(cwd, [
    'log',
    `--max-count=${limit}`,
    '-i',
    `--grep=${query}`,
    `--author=${query}`,
    '--regexp-ignore-case',
    '--date=format:%Y-%m-%d %H:%M',
    `--pretty=format:${fmt}`
  ])
  // --grep + --author mặc định là OR khi không có --all-match → đúng ý "tìm 1 trong 2".
  if (!res.ok) return []
  return res.stdout
    .split(REC)
    .map((r) => r.replace(/^\n/, ''))
    .filter((r) => r.trim())
    .map((rec) => {
      const f = rec.split(SEP)
      return {
        hash: f[0],
        shortHash: f[1],
        author: f[2],
        email: f[3],
        date: f[4],
        relativeDate: f[5],
        subject: f[6],
        body: (f[7] || '').trim()
      } as Commit
    })
}

/** So sánh hai nhánh/ref: commit chỉ có ở head + file khác nhau. */
export async function compareRefs(cwd: string, base: string, head: string): Promise<CompareResult> {
  const commits: Commit[] = []
  const fmt = ['%H', '%h', '%an', '%ae', '%ad', '%ar', '%s', '%b'].join(SEP) + REC
  const logRes = await git(cwd, [
    'log',
    `${base}..${head}`,
    '--date=format:%Y-%m-%d %H:%M',
    `--pretty=format:${fmt}`
  ])
  if (logRes.ok) {
    for (const rec of logRes.stdout.split(REC).map((r) => r.replace(/^\n/, '')).filter((r) => r.trim())) {
      const f = rec.split(SEP)
      commits.push({
        hash: f[0],
        shortHash: f[1],
        author: f[2],
        email: f[3],
        date: f[4],
        relativeDate: f[5],
        subject: f[6],
        body: (f[7] || '').trim()
      })
    }
  }
  const files: FileChange[] = []
  const diffRes = await git(cwd, ['diff', '--name-status', '-z', `${base}...${head}`])
  const parts = diffRes.stdout.split('\0').filter((p) => p.length)
  for (let i = 0; i < parts.length; i++) {
    const code = parts[i][0]
    if (code === 'R' || code === 'C') {
      files.push({ path: parts[i + 2], oldPath: parts[i + 1], type: mapType(code), staged: false })
      i += 2
    } else {
      files.push({ path: parts[i + 1], type: mapType(code), staged: false })
      i += 1
    }
  }
  return { commits, files }
}

/** Diff của 1 file giữa hai ref. */
export async function diffBetween(cwd: string, base: string, head: string, path: string): Promise<FileDiff> {
  const res = await git(cwd, ['diff', '--no-color', `${base}...${head}`, '--', path])
  const binary = /Binary files .* differ/.test(res.stdout)
  return { path, binary, lines: binary ? [] : parseDiff(res.stdout) }
}
