import Store from 'electron-store'
import { app } from 'electron'
import { randomUUID } from 'crypto'
import { promises as fs } from 'fs'
import { basename, join } from 'path'
import * as dvcSvc from './dvc'
import * as gitSvc from './git'
import type { DriveAccount } from '@shared/types'

interface Schema {
  accounts: DriveAccount[]
  /** Map repoPath -> accountId đang dùng. */
  activeByRepo: Record<string, string>
}

const store = new Store<Schema>({
  name: 'accounts',
  defaults: { accounts: [], activeByRepo: {} }
})

function credsDir(): string {
  return join(app.getPath('userData'), 'gdrive-creds')
}

export function listAccounts(): DriveAccount[] {
  return store.get('accounts')
}

export function addAccount(acc: Omit<DriveAccount, 'id'>): DriveAccount {
  const full: DriveAccount = { ...acc, id: randomUUID() }
  store.set('accounts', [...store.get('accounts'), full])
  return full
}

export function updateAccount(acc: DriveAccount): void {
  store.set(
    'accounts',
    store.get('accounts').map((a) => (a.id === acc.id ? acc : a))
  )
}

export function removeAccount(id: string): void {
  store.set(
    'accounts',
    store.get('accounts').filter((a) => a.id !== id)
  )
}

export function getActiveAccountId(repoPath: string): string | null {
  return store.get('activeByRepo')[repoPath] ?? null
}

function setActive(repoPath: string, accountId: string) {
  const map = { ...store.get('activeByRepo'), [repoPath]: accountId }
  store.set('activeByRepo', map)
}

/**
 * Áp dụng (chuyển sang) một tài khoản cho repo: cấu hình DVC remote tương ứng.
 * Với gdrive, mỗi account dùng file credential riêng → đổi account thật sự.
 */
export async function applyAccount(
  repoPath: string,
  accountId: string
): Promise<{ ok: boolean; message?: string }> {
  const acc = store.get('accounts').find((a) => a.id === accountId)
  if (!acc) return { ok: false, message: 'Không tìm thấy tài khoản' }

  if (!(await dvcSvc.isInstalled())) {
    return { ok: false, message: 'Chưa cài DVC. Chạy: pip install dvc dvc-gdrive' }
  }
  if (!(await gitSvc.isGitRepo(repoPath))) await gitSvc.init(repoPath)
  if (!(await dvcSvc.isInitialized(repoPath))) {
    const r = await dvcSvc.init(repoPath)
    if (!r.ok) return { ok: false, message: 'dvc init lỗi: ' + r.stderr }
  }

  if (acc.type === 'local') {
    if (!acc.path) return { ok: false, message: 'Tài khoản thiếu đường dẫn thư mục' }
    const storage = join(acc.path, 'DriveSync-Storage', basename(repoPath))
    await fs.mkdir(storage, { recursive: true })
    const r = await dvcSvc.setRemoteLocal(repoPath, storage)
    if (!r.ok) return { ok: false, message: r.stderr }
  } else {
    if (!acc.folderId) return { ok: false, message: 'Tài khoản thiếu Folder ID' }
    await fs.mkdir(credsDir(), { recursive: true })
    const credsFile = join(credsDir(), acc.id + '.json')
    const r = await dvcSvc.setRemoteGdriveWithCreds(repoPath, acc.folderId, credsFile)
    if (!r.ok) return { ok: false, message: r.stderr }
  }

  setActive(repoPath, accountId)
  return { ok: true }
}
