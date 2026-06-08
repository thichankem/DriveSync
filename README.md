# DriveSync

Phần mềm quản lý dự án & code kiểu **GitHub Desktop**, nhưng lưu trữ data/file lớn bằng
**DVC** trên **Google Drive**. Xây bằng Electron + React + TypeScript.

## Tính năng

- **Quản lý repository**: tạo mới, mở repo có sẵn, clone từ URL, danh sách repo gần đây.
- **Git đầy đủ (như GitHub Desktop)** qua menu **Repository / Branch / Xem**:
  - Thay đổi: stage/unstage bằng checkbox, commit, **amend**, **hoàn tác commit cuối**,
    bỏ hết thay đổi, diff viewer xanh/đỏ.
  - Branch: tạo/đổi tên/xoá, chuyển, **merge**, **rebase**, publish (đặt upstream).
  - Remote: **fetch / pull / push**, quản lý remote (thêm/xoá/sửa URL).
  - Lịch sử: xem file thay đổi của commit, **revert**, **reset (soft/mixed/hard)**, checkout,
    **cherry-pick**, tạo branch / **tag** tại commit.
  - **Stash** (cất tạm), **Tags**, cấu hình **tên/email Git**, mở Explorer/Terminal.
  - **Xử lý xung đột**: banner merge/rebase với nút Tiếp tục / Huỷ.
- **DVC + Google Drive**: khởi tạo DVC, cấu hình remote theo 2 cách:
  - **Thư mục Google Drive Desktop** (khuyên dùng): trỏ tới thư mục Drive đã đồng bộ trên máy.
  - **Google Drive API** (`gdrive://`): đẩy thẳng lên Drive qua OAuth (cần `dvc-gdrive`).
  Track file lớn, `dvc push` / `dvc pull`.
- **Nhiều tài khoản Google Drive / Gmail**: menu **Tài khoản Drive** → lưu nhiều tài khoản
  (thư mục Drive hoặc gdrive Folder ID), **chuyển tài khoản cho từng repo chỉ bằng 1 click**.
  Mỗi tài khoản gdrive dùng file đăng nhập riêng nên đổi Gmail là đổi thật sự.
- **Nút Đồng bộ 1 chạm**: gộp `git pull` → `dvc pull` → `git push` → `dvc push`.

## Yêu cầu

- Node.js 18+ và npm
- Git
- (Tuỳ chọn) Python + DVC: `pip install dvc dvc-gdrive`

## Cách dùng nhanh nhất (khuyên dùng) — bấm 1 file là xong

Sau khi **clone về từ GitHub**, chỉ cần **double-click file `Cài đặt DriveSync.bat`**.
File này sẽ tự động:

1. Cài thư viện (`npm install`)
2. Tạo icon + build ứng dụng
3. **Tạo icon "DriveSync" trên Desktop**
4. Mở ứng dụng luôn

Từ lần sau, chỉ cần **bấm icon "DriveSync" trên Desktop** là chạy ngay (chạy ẩn console).

## Kết nối Google Drive — 1 chạm

Trong app → tab **DVC** → nút **"🔗 Kết nối Google Drive tự động"**. App sẽ tự:
khởi tạo DVC, dò tìm Google Drive for Desktop trên máy, tạo thư mục lưu và cấu hình remote.
Nếu không dò được, app cho bạn chọn thư mục thủ công.

## Chạy ở chế độ phát triển

```bash
npm install
npm run dev
```

## Đóng gói thành app cài đặt .exe (Windows)

```bash
npm run dist:win
```

File cài đặt (`.exe`) nằm trong thư mục `dist/`. Khi cài, nó tự tạo icon trên Desktop &
Start Menu như phần mềm thông thường.

## Cấu trúc

```
src/
  main/      # Electron main process: gọi git/dvc qua CLI
    services/  exec, git, dvc, store, sync
    ipc.ts     đăng ký IPC handlers
  preload/   # cầu nối an toàn (window.api)
  renderer/  # giao diện React
  shared/    # kiểu dữ liệu dùng chung
```
