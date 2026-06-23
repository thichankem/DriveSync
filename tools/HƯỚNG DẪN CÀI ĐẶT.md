# DriveSync — Hướng dẫn cài đặt trên máy mới

DriveSync là ứng dụng đồng bộ code + data qua **Git + DVC + Google Drive**.
Bản thân app chỉ là giao diện; nó **gọi** `git` và `dvc` trên máy, nên máy mới
cần có sẵn các công cụ này. Làm theo 2 bước dưới đây.

## Bước 1 — Cài app

Bấm đúp file cài đặt:

```
DriveSync Setup <phiên bản>.exe
```

Làm theo trình cài đặt → app tạo shortcut ngoài Desktop và Start Menu.
Mở app từ shortcut là dùng được.

## Bước 2 — Cài phụ thuộc (Git + Python + DVC)

**Cách 1 (khuyên dùng): ngay trong app.** Lần đầu mở, nếu thiếu Git/DVC, app
hiện thanh vàng phía trên → bấm **"Cài đặt tự động"**. App tự tải và cài
Git + Python + DVC (kèm hỗ trợ Google Drive). Có thể hiện cửa sổ xác nhận
Windows (UAC) → bấm **Yes**. Cài xong **đóng và mở lại app**.

**Cách 2 (dự phòng): chạy script.** Nếu không muốn cài trong app, bấm đúp:

```
Cài đặt phụ thuộc (chạy 1 lần).bat
```

> Cả hai cách đều cần Windows 10/11 có sẵn **winget** (App Installer từ Microsoft Store).
> Nếu báo "cần mở lại cửa sổ": đóng app rồi mở lại để nhận PATH mới.

---

## Phân phối qua GitHub (cho người tải về)

> File `.exe` cài đặt khá lớn (~80–100 MB) nên **không** đẩy trực tiếp vào kho git
> (thư mục `dist/` đã bị `.gitignore`). Hãy đưa lên **GitHub Releases**:

1. Đẩy mã nguồn lên GitHub như bình thường (`git push`).
2. Tạo Release mới và **đính kèm 2 file**:
   - `dist/DriveSync-Setup-<phiên bản>.exe`
   - cả thư mục `tools/` (hoặc nén lại) để người dùng có script cài phụ thuộc.
3. Người khác vào trang Releases, tải `.exe` + chạy `.bat` cài phụ thuộc → xong.

Lệnh tạo release nhanh bằng GitHub CLI (nếu đã cài `gh`):

```powershell
gh release create v0.1.0 "dist\DriveSync-Setup-0.1.0.exe" --title "DriveSync 0.1.0" --notes "Bản phát hành đầu tiên"
```
