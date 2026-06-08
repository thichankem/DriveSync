import React from 'react'
import { Modal } from './Modal'

export function GuideModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal
      title="Hướng dẫn sử dụng DriveSync"
      onClose={onClose}
      footer={
        <button className="btn accent" onClick={onClose}>
          Đã hiểu
        </button>
      }
    >
      <div className="guide">
        <h3>1. DriveSync là gì?</h3>
        <p>
          Ứng dụng quản lý code kiểu <b>GitHub Desktop</b>, kèm khả năng lưu file/dữ liệu lớn lên{' '}
          <b>Google Drive</b> thông qua <b>DVC</b>. Mọi thao tác đều có trên thanh menu trên cùng:{' '}
          <i>File · Edit · View · Repository · Branch · Google Drive · Help</i>.
        </p>

        <h3>2. Mở / tạo dự án</h3>
        <ul>
          <li><b>File → Tạo repository mới</b>: tạo thư mục dự án mới (tự git init, tuỳ chọn DVC).</li>
          <li><b>File → Thêm repository có sẵn</b>: chọn thư mục đã là git repo trên máy.</li>
          <li><b>File → Clone repository</b>: tải về từ URL (vd GitHub).</li>
          <li>Chuyển nhanh giữa các repo bằng nút <b>“Current repository”</b> ở thanh công cụ.</li>
        </ul>

        <h3>3. Làm việc với thay đổi &amp; commit (tab Thay đổi)</h3>
        <ul>
          <li>Tick chọn file muốn đưa vào commit (giống GitHub Desktop). Click file để xem diff xanh/đỏ.</li>
          <li>Nhập <b>Tóm tắt</b> + <b>Mô tả</b> rồi bấm <b>Commit</b>.</li>
          <li><b>Sửa commit gần nhất (amend)</b>: tick ô amend để chỉnh lại commit vừa tạo.</li>
          <li><b>Hoàn tác commit cuối</b>: gỡ commit gần nhất nhưng giữ nguyên thay đổi.</li>
          <li><b>Cất stash</b>: tạm cất thay đổi để làm việc khác; <b>Bỏ hết</b>: xoá mọi thay đổi chưa commit.</li>
          <li>Click 1 file rồi <b>Huỷ thay đổi</b> để hoàn nguyên riêng file đó.</li>
        </ul>

        <h3>4. Branch (menu Branch)</h3>
        <ul>
          <li><b>Branch mới / Đổi tên / Xoá / Chuyển</b> branch.</li>
          <li><b>Merge</b>: gộp nhánh khác vào nhánh hiện tại. <b>Rebase</b>: dời nhánh hiện tại lên nhánh khác.</li>
          <li><b>Publish branch</b>: đẩy nhánh mới lên remote và đặt upstream.</li>
        </ul>

        <h3>5. Đồng bộ với remote (menu Repository)</h3>
        <ul>
          <li><b>Fetch</b>: lấy thông tin mới từ remote (không đổi code). <b>Pull</b>: kéo về &amp; gộp.</li>
          <li><b>Push</b>: đẩy commit lên. Số <b>↑/↓</b> ở nút Sync cho biết đang hơn/kém remote bao nhiêu commit.</li>
          <li><b>Cài đặt repository</b>: quản lý remote (URL GitHub) và tên/email khi commit.</li>
        </ul>

        <h3>6. Google Drive &amp; DVC (tab DVC / menu Google Drive)</h3>
        <ul>
          <li>
            <b>Kết nối Google Drive tự động</b>: tự khởi tạo DVC, dò Google Drive trên máy và cấu hình
            nơi lưu. Nhanh nhất, khuyên dùng.
          </li>
          <li>Hai cách lưu: <b>Thư mục Google Drive Desktop</b> (vd <code>G:\My Drive</code>) hoặc{' '}
            <b>Google Drive API</b> (gdrive Folder ID, cần đăng nhập lần đầu).</li>
          <li><b>Track file/thư mục</b>: đưa file lớn/dữ liệu vào DVC (thay bằng con trỏ <code>.dvc</code> nhẹ).</li>
          <li><b>Push lên Drive / Pull từ Drive</b>: đẩy/tải dữ liệu DVC.</li>
        </ul>

        <h3>7. Đổi tài khoản Google Drive / Gmail</h3>
        <ul>
          <li><b>Google Drive → Quản lý tài khoản</b>: lưu nhiều tài khoản (mỗi Gmail/Drive một mục).</li>
          <li>Bấm <b>Dùng</b> để chuyển tài khoản cho repo hiện tại — tài khoản đang dùng có dấu ✓.</li>
          <li>Mỗi tài khoản gdrive dùng đăng nhập riêng nên đổi Gmail là đổi thật sự.</li>
        </ul>

        <h3>8. Lịch sử &amp; thao tác trên commit (tab Lịch sử)</h3>
        <ul>
          <li>Chọn commit để xem file thay đổi + diff.</li>
          <li><b>Revert</b>: tạo commit đảo ngược. <b>Reset về đây</b>: soft/mixed/hard.</li>
          <li><b>Checkout</b>, <b>Cherry-pick</b>, <b>Tạo branch / Gắn tag</b> ngay tại commit.</li>
          <li>Di chuột vào 1 file trong commit → bấm <b>⏪</b> để khôi phục riêng file đó về phiên bản đó.</li>
          <li><b>Sao chép mã</b>: lấy mã (hash) của commit.</li>
        </ul>

        <h3>8b. 🕘 Quay lại quá khứ (quan trọng — chống mất code)</h3>
        <ul>
          <li>
            <b>Cỗ máy thời gian</b> (menu Repository → “Quay lại quá khứ”, hoặc Ctrl+H): liệt kê{' '}
            <b>mọi trạng thái</b> dự án từng đi qua — kể cả sau khi lỡ reset, rebase, amend hay xoá
            commit. Bấm <b>Quay về đây</b> để khôi phục, hoặc <b>Tạo branch</b> tại thời điểm đó.
            Đây là “phao cứu sinh”: gần như không bao giờ mất code.
          </li>
          <li>
            <b>Lưu nhanh (💾)</b>: ở tab Thay đổi hoặc Ctrl+Shift+S — tạo một “điểm khôi phục” từ
            trạng thái hiện tại để sau này luôn quay lại được.
          </li>
          <li><b>Gộp commit (🔀)</b>: gộp nhiều commit gần nhất thành một cho gọn lịch sử.</li>
          <li><b>So sánh nhánh (⚖️)</b>: xem khác biệt commit/file giữa hai nhánh.</li>
          <li><b>Tìm trong lịch sử (🔍)</b>: lọc commit theo nội dung hoặc tác giả ở tab Lịch sử.</li>
        </ul>

        <h3>9. Đồng bộ 1 chạm (nút Sync)</h3>
        <p>
          Nút <b>“Đồng bộ Drive”</b> (hoặc Ctrl+S) chạy lần lượt: <i>git pull → dvc pull → git push →
          dvc push</i>. Bước nào chưa cấu hình sẽ tự bỏ qua.
        </p>

        <h3>10. Xử lý xung đột</h3>
        <p>
          Khi merge/rebase bị xung đột, một dải vàng hiện ra. Sửa file xung đột trong trình soạn thảo,
          rồi bấm <b>Tiếp tục</b> để hoàn tất hoặc <b>Huỷ</b> để quay lại.
        </p>

        <h3>11. Phím tắt</h3>
        <ul>
          <li>Ctrl+N tạo repo · Ctrl+O thêm repo · Ctrl+Shift+O clone</li>
          <li>Ctrl+1/2/3 chuyển tab Thay đổi/Lịch sử/DVC · Ctrl+R làm mới</li>
          <li>Ctrl+P Push · Ctrl+Shift+P Pull · Ctrl+S Sync · Ctrl+Shift+N branch mới</li>
          <li>F1 mở hướng dẫn này</li>
        </ul>

        <h3>12. Khắc phục sự cố</h3>
        <ul>
          <li><b>Chưa cài DVC</b>: chạy <code>pip install dvc dvc-gdrive</code> rồi mở lại app.</li>
          <li><b>Không dò được Google Drive</b>: cài &amp; đăng nhập “Google Drive for Desktop”, hoặc chọn thư mục thủ công.</li>
          <li><b>Push GitHub báo lỗi xác thực</b>: cấu hình Git Credential Manager hoặc dùng token.</li>
        </ul>
      </div>
    </Modal>
  )
}
