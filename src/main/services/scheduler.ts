import Store from 'electron-store'
import { BrowserWindow } from 'electron'
import * as gitSvc from './git'
import * as dvcSvc from './dvc'
import type { BackupSchedule } from '@shared/types'

interface Schema {
  schedules: Record<string, BackupSchedule>
}

const store = new Store<Schema>({ name: 'schedule', defaults: { schedules: {} } })
const timers = new Map<string, ReturnType<typeof setInterval>>()
let getWin: () => BrowserWindow | null = () => null

const UNIT_MS = { minute: 60_000, hour: 3_600_000, day: 86_400_000 }

export function getSchedule(repoPath: string): BackupSchedule {
  return store.get('schedules')[repoPath] ?? { enabled: false, every: 30, unit: 'minute', action: 'commit' }
}

export function setSchedule(repoPath: string, cfg: BackupSchedule): void {
  const all = { ...store.get('schedules'), [repoPath]: cfg }
  store.set('schedules', all)
  arm(repoPath, cfg)
}

function notify(repoPath: string, message: string) {
  getWin()?.webContents.send('schedule:ran', { repoPath, message, time: Date.now() })
}

async function runBackup(repoPath: string, cfg: BackupSchedule) {
  if (!(await gitSvc.isGitRepo(repoPath))) return
  const stamp = new Date().toLocaleString('vi-VN')
  // 1) commit nhanh (nếu có thay đổi)
  await gitSvc.snapshot(repoPath, `Tự động sao lưu — ${stamp}`)

  let msg = 'Đã tạo điểm sao lưu (commit)'
  if (cfg.action === 'push' || cfg.action === 'sync') {
    if (await gitSvc.hasRemote(repoPath)) {
      const r = await gitSvc.push(repoPath)
      msg = r.ok ? 'Đã commit + push GitHub' : 'Commit xong, push lỗi'
    }
  }
  if (cfg.action === 'sync') {
    if (await dvcSvc.hasRemote(repoPath)) {
      const r = await dvcSvc.push(repoPath)
      msg += r.ok ? ' + đẩy data lên Drive' : ' (đẩy Drive lỗi)'
    }
  }

  const all = store.get('schedules')
  if (all[repoPath]) {
    all[repoPath] = { ...all[repoPath], lastRun: Date.now() }
    store.set('schedules', all)
  }
  notify(repoPath, msg)
}

function arm(repoPath: string, cfg: BackupSchedule) {
  const existing = timers.get(repoPath)
  if (existing) {
    clearInterval(existing)
    timers.delete(repoPath)
  }
  if (!cfg.enabled) return
  const ms = Math.max(1, cfg.every) * UNIT_MS[cfg.unit]
  const t = setInterval(() => {
    runBackup(repoPath, cfg).catch(() => {})
  }, ms)
  timers.set(repoPath, t)
}

/** Gọi khi app khởi động: bật lại mọi lịch đã lưu. */
export function initScheduler(getWindow: () => BrowserWindow | null) {
  getWin = getWindow
  const all = store.get('schedules')
  for (const [repoPath, cfg] of Object.entries(all)) {
    if (cfg.enabled) arm(repoPath, cfg)
  }
}
