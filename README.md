# PC Builder 3D - Trình Mô Phỏng Lắp Ráp Máy Tính 3D Chuẩn Thực Tế

Trình mô phỏng 3D tương tác trực quan cao cấp chạy trực tiếp trên nền tảng Web (Three.js + Vite), được thiết kế đặc biệt dành cho người mới bắt đầu làm quen với phần cứng và lắp ráp máy tính.

---

## 🌟 Các Tính Năng Nổi Bật

1. **Không gian căn phòng xưởng công nghệ (Tech Workshop) 3D rộng sáng:**
   - Bàn gỗ lắp ráp trung tâm (Wooden Workbench) với thảm lót chống tĩnh điện (Antistatic Pad).
   - Kệ sắt 4 tầng bên phải (Iron Rack) chứa sẵn các vỏ hộp và linh kiện máy tính vật lý.
   - Thùng máy tính ATX rỗng (PC Case) có thể tháo lắp nắp kính bên hông và quan sát chi tiết bên trong.
   - Màn hình máy tính gaming 27 inch hiển thị trực tiếp quá trình kiểm tra POST, BIOS và màn hình Windows Desktop khi máy khởi động thành công.

2. **Cơ chế điều khiển First-Person linh hoạt:**
   - `W`, `A`, `S`, `D` hoặc 4 phím mũi tên: Di chuyển xung quanh phòng với hệ thống va chạm vật lý (không đi xuyên tường hay xuyên bàn).
   - **Shift-Lock**: Tự động bật khóa tâm chuột khi vào game. Nhấn `Shift` để bật/tắt Shift-Lock (giải phóng chuột tự do).
   - **Chuột trái (LMB)**: Nhặt linh kiện từ bàn linh kiện, tương tác với các vị trí lắp ráp trên thùng máy, mở nắp kính, bật công tắc nguồn.
   - **Chuột phải (RMB giữ + rê chuột)**: Xoay 360° vật thể đang cầm trên tay để quan sát chi tiết chân pin, khe cắm, lá tản nhiệt.
   - `E`: Cất linh kiện đang cầm trên tay vào Túi đồ (Inventory).
   - `R`: Mở / Đóng giao diện Kho đồ (RPG Inventory).

3. **Kho đồ RPG Inventory chuẩn chuyên nghiệp:**
   - Làm mờ hậu cảnh (`backdrop-filter: blur(20px)`), phong cách Glassmorphism Cyberpunk.
   - **Góc trên bên trái (Ô vuông)**: Hiển thị mô hình 3D tương tác thời gian thực của linh kiện đang chọn (kéo chuột để xoay 360°, ánh sáng studio).
   - **Góc trên bên phải (Ô chữ nhật)**:
     - Tag loại linh kiện (Tag: `Motherboard`, `CPU`, `GPU`, `RAM`, `CPU Cooler`, `Storage`, `Power Supply`).
     - Tên đầy đủ, thương hiệu, giá tham khảo thực tế.
     - Bảng thông số kỹ thuật chi tiết (Socket, Chipset, Số nhân luồng, Bus RAM, VRAM, TDP...).
     - Lời khuyên & kiến thức thực tế dành cho người mới ("Kiến thức cho người mới").
     - Các nút chức năng: **Cầm trên tay (Equip)**, **Lắp trực tiếp vào case**, **Cất lại lên bàn**.
   - **Không gian phía dưới**:
     - Các tab phân loại danh mục.
     - Lưới hiển thị các ô linh kiện trong túi với badge trạng thái (*Trong túi*, *Đang cầm*, *Đã lắp*, *Trên kệ*).

4. **12 Bước lắp ráp chuẩn thực tế (Interactive Quest Tracker):**
   - **Bước 1**: Tháo nắp kính cường lực thùng case.
   - **Bước 2**: Lắp Bo mạch chủ (Motherboard) vào các ốc chân đồng (standoffs).
   - **Bước 3**: Lắp Bộ vi xử lý (CPU AMD Ryzen) vào socket theo chiều tam giác vàng.
   - **Bước 4**: Bôi keo tản nhiệt và gắn Tháp tản nhiệt CPU Cooler Master.
   - **Bước 5**: Cắm thanh RAM G.SKILL Trident Z RGB vào khe Dual Channel 2 & 4.
   - **Bước 6**: Lắp Ổ cứng SSD Samsung thể rắn.
   - **Bước 7**: Lắp Bộ nguồn máy tính (PSU) vào hộc đáy case.
   - **Bước 8**: Lắp Card màn hình rời NVIDIA RTX 3090 vào khe PCIe x16.
   - **Bước 9**: Cắm Dây nguồn 24-Pin, 8-Pin CPU, PCIe và cáp nút nguồn.
   - **Bước 10**: Đóng nắp kính cường lực thùng máy.
   - **Bước 11**: Cắm cáp màn hình DisplayPort vào Card đồ họa & cắm nguồn điện.
   - **Bước 12**: BẬT NGUỒN! Đèn RGB đổi màu, quạt quay, tiếng beep POST vang lên và màn hình khởi động Windows báo cáo thành công cùng hiệu ứng pháo hoa chúc mừng!

5. **Hệ thống âm thanh Web Audio chân thực:**
   - Tiếng click lẫy RAM / PCIe ("Tách" đanh gọn).
   - Tiếng siết ốc kim loại.
   - Tiếng công tắc bật nguồn.
   - Tiếng còi Beep POST bo mạch chủ.
   - Tiếng gió êm của quạt tản nhiệt quay.
   - Giai điệu chúc mừng khi hoàn thành.

---

## 🚀 Hướng Dẫn Khởi Chạy

> **Bắt buộc: máy phải có [Node.js 18 trở lên](https://nodejs.org).** Kiểm tra bằng cách mở
> PowerShell và gõ `node -v`. Nếu không có số phiên bản hiện ra, hãy cài Node.js rồi mở lại máy.

### Cách 1: Bấm một phát (khuyên dùng)

1. Tải mã nguồn về: vào trang repo → nút **Code** → **Download ZIP** (khoảng 194 MB, vì có sẵn
   27 file model `.glb` bên trong).
2. Giải nén ZIP ra một thư mục.
3. **Double click vào `start.bat`.**

Lần chạy đầu tiên, `start.bat` sẽ tự cài thư viện (vài phút) rồi mở trình duyệt tại
`http://localhost:5173`. Các lần sau chỉ mất vài giây.

### Cách 2: Gõ lệnh trong PowerShell

```powershell
cd <đường-dẫn-tới-thư-mục-dự-án>
npm install     # chỉ cần làm lần đầu
npm run dev
```

Rồi mở trình duyệt tại `http://localhost:5173`.

### Vì sao phải `npm install`?

`node_modules` — nơi chứa thư viện như Three.js và Vite — **không được lưu trong repo** (nặng
hơn 250 MB), nên sau khi tải mã nguồn về thư mục đó chưa tồn tại. Lệnh `npm run dev` gọi đúng tên
`vite` nằm trong đó, nên thiếu bước này sẽ báo:

```
'vite' is not recognized as an internal or external command
```

`start.bat` đã tự làm bước này giúp bạn.

### Không mở thẳng file `index.html`

Dự án dùng ES modules, trình duyệt chặn việc nạp chúng qua `file://` — double click
`index.html` sẽ ra màn hình trắng. Phải qua server (`npm run dev` hoặc `start.bat`).
Xem trực tiếp trên trang GitHub cũng không chạy được, vì GitHub không phải là web server.

---

## 🛠 Xử Lý Sự Cố

### Trình duyệt báo `localhost refused to connect` / `ERR_CONNECTION_REFUSED`

Cửa sổ đen đã báo lỗi, hoặc nó không mở cửa sổ nào cả. Vài nguyên nhân thường gặp:

- **Cổng 5173 đang bị chiếm** bởi một bản game khác đang chạy. Cửa sổ đen sẽ in ra
  `Port 5173 is already in use`. Tắt bản kia đi rồi chạy lại — dự án cố ý **không** tự đổi
  cổng, vì mọi hướng dẫn đều ghi địa chỉ `localhost:5173`.
- **Bạn mở nhầm cổng.** Nếu cửa sổ đen ghi rõ địa chỉ nào thì mở đúng địa chỉ đó.
- **Server chưa lên.** Đợi vài giây rồi bấm F5.

### Không thấy "tab server" như hướng dẫn khác

Bảng **PORTS** là của VS Code, không phải của game. Nó hiện cổng server đang chạy, và chỉ hiện
khi bạn chạy `npm run dev` **từ terminal tích hợp của VS Code**. Mở nó bằng `Ctrl+Shift+P` rồi
gõ **Ports: Focus on Ports View**. Nếu bạn chạy game bằng `start.bat` thì không có tab nào cả —
đó là bình thường, cứ chạy `start.bat`.

### Màn hình trắng, không thấy gì

- Kiểm tra cửa sổ đen có còn chạy không (đừng tắt nó).
- Mở Console của trình duyệt (F12) để xem lỗi.
- Nếu vừa đổi máy hoặc đổi phiên bản Three.js, xoá thư mục `node_modules` rồi `npm install`
  lại.

### Máy chậm, quay giật

Trình duyệt đang tải 27 file model `.glb` (tổng 194 MB). Lần đầu mất lâu là bình thường. Nên dùng
Chrome hoặc Edge, và tắt các thẻ tab khác để nhánh đồ họa có nhiều bộ nhớ.
