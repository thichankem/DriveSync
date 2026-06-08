import { existsSync, promises as fs } from 'fs'
import { basename, join } from 'path'
import * as gitSvc from './git'
import * as dvcSvc from './dvc'

export interface AutoConnectResult {
  ok: boolean
  message?: string
  path?: string
  driveRoot?: string
  /** true nếu không dò được Drive và cần người dùng chọn thủ công. */
  needFolder?: boolean
}

/** Dò các vị trí Google Drive for Desktop phổ biến trên Windows. */
export function detectDriveRoots(): string[] {
  const roots: string[] = []
  // Google Drive mount thành ổ đĩa ảo (thường G:), chứa "My Drive".
  for (let c = 68; c <= 90; c++) {
    const letter = String.fromCharCode(c) // D..Z
    const p = `${letter}:\\My Drive`
    try {
      if (existsSync(p)) roots.push(p)
    } catch {
      /* bỏ qua ổ không truy cập được */
    }
  }
  // Chế độ "mirror" có thể nằm trong thư mục người dùng.
  const home = process.env.USERPROFILE
  if (home) {
    for (const name of ['My Drive', 'Google Drive']) {
      const p = join(home, name)
      if (existsSync(p)) roots.push(p)
    }
  }
  return [...new Set(roots)]
}

/**
 * Kết nối Google Drive cho repo trong một bước:
 * tự init git (nếu cần) → init dvc (nếu cần) → dò Drive → tạo thư mục lưu →
 * đặt làm DVC remote mặc định.
 */
export async function autoConnect(repoPath: string): Promise<AutoConnectResult> {
  if (!(await dvcSvc.isInstalled())) {
    return { ok: false, message: 'Chưa cài DVC. Chạy: pip install dvc dvc-gdrive' }
  }
  if (!(await gitSvc.isGitRepo(repoPath))) {
    await gitSvc.init(repoPath)
  }
  if (!(await dvcSvc.isInitialized(repoPath))) {
    const r = await dvcSvc.init(repoPath)
    if (!r.ok) return { ok: false, message: 'dvc init lỗi: ' + r.stderr }
  }

  const roots = detectDriveRoots()
  if (roots.length === 0) {
    return {
      ok: false,
      needFolder: true,
      message:
        'Không tìm thấy Google Drive for Desktop. Hãy cài & đăng nhập Google Drive, hoặc chọn thư mục thủ công.'
    }
  }

  const storage = join(roots[0], 'DriveSync-Storage', basename(repoPath))
  await fs.mkdir(storage, { recursive: true })
  const r = await dvcSvc.setRemoteLocal(repoPath, storage)
  if (!r.ok) return { ok: false, message: 'Cấu hình remote lỗi: ' + r.stderr }

  return { ok: true, path: storage, driveRoot: roots[0] }
}
