import * as gitSvc from './git'
import * as dvcSvc from './dvc'
import type { SyncResult, SyncStep } from '@shared/types'

export type ProgressFn = (step: SyncStep, log?: string) => void

/**
 * Quy trình Sync giống nút "Sync" của GitHub Desktop, mở rộng cho DVC:
 *  1. git pull --rebase  (lấy code mới)
 *  2. dvc pull           (lấy data mới từ Drive)
 *  3. git push           (đẩy code lên)
 *  4. dvc push           (đẩy data lên Drive)
 * Bước nào không áp dụng (không có remote / không init dvc) sẽ được bỏ qua.
 */
export async function runSync(cwd: string, progress: ProgressFn): Promise<SyncResult> {
  const steps: SyncStep[] = [
    { key: 'git-pull', label: 'Git: lấy thay đổi (pull)', status: 'pending' },
    { key: 'dvc-pull', label: 'DVC: tải data từ Drive (pull)', status: 'pending' },
    { key: 'git-push', label: 'Git: đẩy commit (push)', status: 'pending' },
    { key: 'dvc-push', label: 'DVC: đẩy data lên Drive (push)', status: 'pending' }
  ]
  const update = (key: string, patch: Partial<SyncStep>, log?: string) => {
    const s = steps.find((x) => x.key === key)!
    Object.assign(s, patch)
    progress(s, log)
  }

  const hasGitRemote = await gitSvc.hasRemote(cwd)
  const dvcReady = await dvcSvc.hasRemote(cwd)
  let ok = true

  // 1. git pull
  if (hasGitRemote) {
    update('git-pull', { status: 'running' })
    const r = await gitSvc.pull(cwd, (c) => update('git-pull', { status: 'running' }, c))
    update('git-pull', { status: r.ok ? 'done' : 'error', detail: r.ok ? undefined : r.stderr })
    if (!r.ok) ok = false
  } else {
    update('git-pull', { status: 'skipped', detail: 'Chưa cấu hình git remote' })
  }

  // 2. dvc pull
  if (dvcReady) {
    update('dvc-pull', { status: 'running' })
    const r = await dvcSvc.pull(cwd, (c) => update('dvc-pull', { status: 'running' }, c))
    update('dvc-pull', { status: r.ok ? 'done' : 'error', detail: r.ok ? undefined : r.stderr })
    if (!r.ok) ok = false
  } else {
    update('dvc-pull', { status: 'skipped', detail: 'Chưa cấu hình DVC remote' })
  }

  // 3. git push
  if (hasGitRemote) {
    update('git-push', { status: 'running' })
    const r = await gitSvc.push(cwd, (c) => update('git-push', { status: 'running' }, c))
    update('git-push', { status: r.ok ? 'done' : 'error', detail: r.ok ? undefined : r.stderr })
    if (!r.ok) ok = false
  } else {
    update('git-push', { status: 'skipped', detail: 'Chưa cấu hình git remote' })
  }

  // 4. dvc push
  if (dvcReady) {
    update('dvc-push', { status: 'running' })
    const r = await dvcSvc.push(cwd, (c) => update('dvc-push', { status: 'running' }, c))
    update('dvc-push', { status: r.ok ? 'done' : 'error', detail: r.ok ? undefined : r.stderr })
    if (!r.ok) ok = false
  } else {
    update('dvc-push', { status: 'skipped', detail: 'Chưa cấu hình DVC remote' })
  }

  return { ok, steps }
}
