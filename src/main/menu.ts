import { app, Menu, shell, dialog, BrowserWindow } from 'electron'
import type { MenuItemConstructorOptions } from 'electron'

/**
 * Tạo thanh menu native (giống GitHub Desktop): File / Edit / View /
 * Repository / Branch / Google Drive / Help. Mỗi mục gửi 'menu:action'
 * xuống renderer để xử lý với ngữ cảnh repo hiện tại.
 */
export function createAppMenu(getWindow: () => BrowserWindow | null) {
  const send = (action: string) => getWindow()?.webContents.send('menu:action', action)
  const item = (label: string, action: string, accelerator?: string): MenuItemConstructorOptions => ({
    label,
    accelerator,
    click: () => send(action)
  })

  const template: MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        item('Tạo repository mới…', 'new-repo', 'CmdOrCtrl+N'),
        item('Thêm repository có sẵn…', 'add-repo', 'CmdOrCtrl+O'),
        item('Clone repository…', 'clone-repo', 'CmdOrCtrl+Shift+O'),
        { type: 'separator' },
        item('Cài đặt repository…', 'repo-settings'),
        { type: 'separator' },
        { label: 'Thoát', role: 'quit' }
      ]
    },
    {
      label: 'Edit',
      submenu: [
        { label: 'Hoàn tác', role: 'undo' },
        { label: 'Làm lại', role: 'redo' },
        { type: 'separator' },
        { label: 'Cắt', role: 'cut' },
        { label: 'Sao chép', role: 'copy' },
        { label: 'Dán', role: 'paste' },
        { label: 'Chọn tất cả', role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        item('Thay đổi (Changes)', 'view-changes', 'CmdOrCtrl+1'),
        item('Lịch sử (History)', 'view-history', 'CmdOrCtrl+2'),
        item('Đồ thị nhánh (Graph)', 'view-graph', 'CmdOrCtrl+4'),
        item('DVC + Google Drive', 'view-dvc', 'CmdOrCtrl+3'),
        item('Làm mới dữ liệu', 'refresh', 'CmdOrCtrl+R'),
        { type: 'separator' },
        { label: 'Phóng to', role: 'zoomIn' },
        { label: 'Thu nhỏ', role: 'zoomOut' },
        { label: 'Cỡ gốc', role: 'resetZoom' },
        { label: 'Toàn màn hình', role: 'togglefullscreen' },
        { label: 'Công cụ lập trình (DevTools)', role: 'toggleDevTools' }
      ]
    },
    {
      label: 'Repository',
      submenu: [
        item('Push (đẩy commit lên)', 'push', 'CmdOrCtrl+P'),
        item('Pull (kéo về, rebase)', 'pull', 'CmdOrCtrl+Shift+P'),
        item('Pull (kéo về, kiểu merge)', 'pull-merge'),
        item('Fetch (lấy thông tin remote)', 'fetch', 'CmdOrCtrl+Shift+T'),
        item('Push ép buộc an toàn…', 'force-push'),
        item('Đồng bộ tất cả (Git + Drive)', 'sync', 'CmdOrCtrl+S'),
        { type: 'separator' },
        item('🕘 Quay lại quá khứ (Cỗ máy thời gian)…', 'timemachine', 'CmdOrCtrl+H'),
        item('💾 Lưu nhanh (điểm khôi phục)', 'snapshot', 'CmdOrCtrl+Shift+S'),
        item('🔀 Gộp commit gần nhất…', 'squash'),
        item('⚖️ So sánh nhánh…', 'compare'),
        { type: 'separator' },
        item('Mở trong File Explorer', 'open-explorer', 'CmdOrCtrl+Shift+F'),
        item('Mở trong Terminal', 'open-terminal', 'CmdOrCtrl+`'),
        { type: 'separator' },
        item('Stash (cất tạm)…', 'stash'),
        item('Tags…', 'tags'),
        item('Cài đặt repository…', 'repo-settings'),
        { type: 'separator' },
        item('Gỡ repo khỏi danh sách', 'remove-repo')
      ]
    },
    {
      label: 'Branch',
      submenu: [
        item('Branch mới…', 'new-branch', 'CmdOrCtrl+Shift+N'),
        item('Đổi tên branch hiện tại…', 'rename-branch'),
        item('Xoá branch…', 'delete-branch'),
        { type: 'separator' },
        item('Chuyển branch…', 'switch-branch'),
        item('Merge nhánh khác vào nhánh hiện tại…', 'merge'),
        item('Rebase nhánh hiện tại lên nhánh khác…', 'rebase'),
        { type: 'separator' },
        item('Publish branch (đặt upstream)', 'publish')
      ]
    },
    {
      label: 'Google Drive',
      submenu: [
        item('Đồng bộ tất cả (Sync)', 'sync'),
        { type: 'separator' },
        item('Đẩy data lên Drive (dvc push)', 'dvc-push'),
        item('Tải data về từ Drive (dvc pull)', 'dvc-pull'),
        { type: 'separator' },
        item('Quản lý tài khoản Google Drive…', 'accounts'),
        item('Kết nối Google Drive tự động', 'drive-connect'),
        { type: 'separator' },
        item('⏰ Tự động sao lưu theo lịch…', 'schedule')
      ]
    },
    {
      label: 'Help',
      submenu: [
        item('Hướng dẫn sử dụng', 'guide', 'F1'),
        {
          label: 'Giới thiệu DriveSync',
          click: () => {
            const win = getWindow()
            dialog.showMessageBox(win!, {
              type: 'info',
              title: 'Giới thiệu DriveSync',
              message: 'DriveSync ' + app.getVersion(),
              detail:
                'Quản lý dự án & code kiểu GitHub Desktop, lưu trữ data/file lớn bằng DVC trên Google Drive.\n\nElectron + React + TypeScript.'
            })
          }
        },
        { type: 'separator' },
        {
          label: 'Mã nguồn trên GitHub',
          click: () => shell.openExternal('https://github.com/thichankem/DriveSync')
        },
        {
          label: 'Tài liệu DVC',
          click: () => shell.openExternal('https://dvc.org/doc')
        }
      ]
    }
  ]

  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}
