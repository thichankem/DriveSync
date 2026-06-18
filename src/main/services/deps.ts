import { run, commandExists } from './exec'
import type { DepsStatus } from '@shared/types'

/** Kiểm tra các công cụ CLI mà app cần để chạy thật (git, dvc, python). */
export async function check(): Promise<DepsStatus> {
  const [git, dvc, python] = await Promise.all([
    commandExists('git'),
    commandExists('dvc'),
    commandExists('python')
  ])
  return { git, dvc, python, ok: git && dvc }
}

/**
 * Cài đặt tự động các phụ thuộc còn thiếu.
 *  - git, python  → qua winget (có thể bật UAC để cài).
 *  - dvc          → qua pip (kèm dvc-gdrive cho Google Drive).
 * Stream log realtime qua onData. Chỉ hỗ trợ Windows.
 */
export async function install(onData: (s: string) => void): Promise<DepsStatus> {
  const log = (s: string) => onData(s.endsWith('\n') ? s : s + '\n')

  if (process.platform !== 'win32') {
    log('Tự động cài đặt chỉ hỗ trợ Windows. Vui lòng cài git/dvc thủ công.')
    return check()
  }

  const hasWinget = await commandExists('winget')
  if (!hasWinget) {
    log('[!] Không tìm thấy "winget" (App Installer).')
    log('    Hãy cập nhật Windows hoặc cài "App Installer" từ Microsoft Store rồi thử lại.')
    return check()
  }

  const before = await check()

  // 1) Git
  if (before.git) {
    log('==> Git đã có, bỏ qua.')
  } else {
    log('==> Đang cài Git (có thể hiện cửa sổ xác nhận UAC)...')
    await run(
      'winget',
      ['install', '--id', 'Git.Git', '-e', '--silent',
        '--accept-source-agreements', '--accept-package-agreements'],
      { onData: (c) => onData(c) }
    )
  }

  // 2) Python (cần cho DVC)
  let hasPython = before.python
  if (hasPython) {
    log('==> Python đã có, bỏ qua.')
  } else {
    log('==> Đang cài Python 3.12...')
    await run(
      'winget',
      ['install', '--id', 'Python.Python.3.12', '-e', '--silent',
        '--accept-source-agreements', '--accept-package-agreements'],
      { onData: (c) => onData(c) }
    )
    hasPython = await commandExists('python')
  }

  // 3) DVC + hỗ trợ Google Drive
  if (before.dvc) {
    log('==> DVC đã có, bỏ qua.')
  } else if (hasPython) {
    log('==> Đang cài DVC (kèm hỗ trợ Google Drive)...')
    await run('python', ['-m', 'pip', 'install', '--upgrade', 'pip'], { onData: (c) => onData(c) })
    await run('python', ['-m', 'pip', 'install', 'dvc', 'dvc-gdrive'], { onData: (c) => onData(c) })
  } else {
    log('[!] Chưa có Python nên chưa cài được DVC. Hãy khởi động lại app rồi cài tiếp.')
  }

  log('')
  log('==> Hoàn tất. Hãy ĐÓNG VÀ MỞ LẠI app để nhận các công cụ vừa cài (cập nhật PATH).')
  return check()
}
