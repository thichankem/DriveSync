import { promises as fs } from 'fs'
import { join } from 'path'
import { run, commandExists } from './exec'
import type { DvcInfo, DvcStatusItem } from '@shared/types'

async function dvc(cwd: string, args: string[], onData?: (s: string) => void) {
  return run('dvc', args, { cwd, onData: (c) => onData?.(c) })
}

export async function isInstalled(): Promise<boolean> {
  return commandExists('dvc')
}

async function isInitialized(cwd: string): Promise<boolean> {
  try {
    await fs.access(join(cwd, '.dvc'))
    return true
  } catch {
    return false
  }
}

export async function info(cwd: string): Promise<DvcInfo> {
  const installed = await isInstalled()
  if (!installed) {
    return { installed: false, initialized: false, remotes: [], status: [] }
  }
  const initialized = await isInitialized(cwd)
  if (!initialized) {
    return { installed: true, initialized: false, remotes: [], status: [] }
  }

  // Danh sách remote
  const remoteRes = await dvc(cwd, ['remote', 'list'])
  const defaultRes = await dvc(cwd, ['remote', 'default'])
  const defaultName = defaultRes.ok ? defaultRes.stdout.trim() : ''
  const remotes = remoteRes.stdout
    .split('\n')
    .filter((l) => l.trim())
    .map((l) => {
      const [name, ...rest] = l.trim().split(/\s+/)
      return { name, url: rest.join(' '), default: name === defaultName }
    })

  // Trạng thái: file nào đã đổi / chưa push
  const status: DvcStatusItem[] = []
  const statusRes = await dvc(cwd, ['status'])
  if (statusRes.stdout.trim() && !/up to date/i.test(statusRes.stdout)) {
    for (const line of statusRes.stdout.split('\n')) {
      const t = line.trim()
      if (t && t.endsWith(':')) {
        status.push({ path: t.replace(/:$/, ''), state: 'changed' })
      }
    }
  }

  return { installed: true, initialized: true, remotes, status }
}

export async function init(cwd: string, onData?: (s: string) => void) {
  // --subdir cho phép init trong repo con; mặc định init tại gốc git repo.
  return dvc(cwd, ['init'], onData)
}

export async function add(cwd: string, paths: string[], onData?: (s: string) => void) {
  return dvc(cwd, ['add', ...paths], onData)
}

export async function setRemoteLocal(cwd: string, folderPath: string) {
  // Trỏ remote 'drive' tới một thư mục cục bộ (vd thư mục Google Drive Desktop).
  const res = await dvc(cwd, ['remote', 'add', '-d', '-f', 'drive', folderPath])
  return res
}

export async function setRemoteGdrive(cwd: string, folderId: string) {
  const add = await dvc(cwd, ['remote', 'add', '-d', '-f', 'drive', `gdrive://${folderId}`])
  if (!add.ok) return add
  // Tránh lỗi quota/abuse khi tải file lớn.
  await dvc(cwd, ['remote', 'modify', 'drive', 'gdrive_acknowledge_abuse', 'true'])
  return add
}

export async function setRemoteGdriveWithCreds(cwd: string, folderId: string, credsFile: string) {
  const add = await dvc(cwd, ['remote', 'add', '-d', '-f', 'drive', `gdrive://${folderId}`])
  if (!add.ok) return add
  // Mỗi tài khoản Gmail dùng 1 file credential riêng → đổi account = đổi file này.
  await dvc(cwd, ['remote', 'modify', 'drive', 'gdrive_user_credentials_file', credsFile])
  await dvc(cwd, ['remote', 'modify', 'drive', 'gdrive_acknowledge_abuse', 'true'])
  return add
}

/** Đọc URL remote 'drive' hiện tại (để biết đang dùng account nào). */
export async function getDriveRemote(cwd: string): Promise<{ url: string; credsFile: string } | null> {
  if (!(await isInitialized(cwd))) return null
  const list = await dvc(cwd, ['remote', 'list'])
  const line = list.stdout.split('\n').find((l) => l.trim().startsWith('drive'))
  if (!line) return null
  const url = line.trim().split(/\s+/).slice(1).join(' ')
  const creds = await dvc(cwd, ['remote', 'modify', '--local', 'drive', 'gdrive_user_credentials_file'])
  // Lệnh trên không đọc được giá trị; thay vào đó đọc qua `dvc config`.
  const cfg = await dvc(cwd, ['config', 'remote.drive.gdrive_user_credentials_file'])
  return { url, credsFile: (cfg.ok ? cfg.stdout.trim() : creds.stdout.trim()) || '' }
}

export async function push(cwd: string, onData?: (s: string) => void) {
  return dvc(cwd, ['push'], onData)
}

export async function pull(cwd: string, onData?: (s: string) => void) {
  return dvc(cwd, ['pull'], onData)
}

export async function hasRemote(cwd: string): Promise<boolean> {
  if (!(await isInitialized(cwd))) return false
  const res = await dvc(cwd, ['remote', 'list'])
  return res.ok && res.stdout.trim().length > 0
}

export { isInitialized }
