# PROJECT CONTEXT: PC BUILDER 3D (TRÌNH MÔ PHỎNG LẮP RÁP MÁY TÍNH 3D)

> **File này lưu trữ toàn bộ bối cảnh, kiến trúc, thư mục, mô hình dữ liệu và cơ chế hoạt động của dự án PC Builder 3D. Được tối ưu hóa cho AI LLM (Gemini, Claude, GPT) để nắm bắt và tiếp tục phát triển.**

---

## 1. Ý TƯỞNG & MỤC TIÊU DỰ ÁN (PROJECT VISION & GOALS)

- **Mục tiêu cốt lõi**: Xây dựng một ứng dụng web 3D mô phỏng lắp ráp thùng máy tính (PC Building Simulator) tương tác thời gian thực, trực quan, thân thiện cho người mới bắt đầu làm quen với kiến trúc phần cứng máy tính.
- **Phương pháp tiếp cận**:
  - Không gian căn phòng xưởng công nghệ (Tech Workshop) 3D sáng sủa, thoáng đãng, phong cách hiện đại.
  - Góc nhìn thứ nhất (First-person perspective) với chuyển động mượt mà, hỗ trợ cơ chế Shift-Lock (khóa tâm) và tâm ngắm crosshair.
  - Hệ thống lắp ráp tuân thủ chặt chẽ **12 bước chuẩn thực tế** (chuẩn bị thùng máy, mở kính, bắt ốc chân đồng mainboard, lắp CPU đúng tam giác vàng, bôi keo tản nhiệt, gắn tản khí/AIO, cắm RAM kênh đôi, lắp SSD/M.2, gắn nguồn PSU, cắm card đồ họa PCIe x16, đi dây cáp nguồn, đóng nắp kính, cắm dây màn hình và khởi động chạy thử).
  - Kho đồ (RPG Inventory) phong cách lưới ô vuông (Square Slots Grid) có khả năng xem trước mô hình 3D xoay 360°, tra cứu thông số kỹ thuật thực tế (Wiki Specs) và phân loại linh kiện theo các Tag rõ ràng.

---

## 2. CÔNG NGHỆ & THƯ VIỆN SỬ DỤNG (TECH STACK)

| Công nghệ | Phiên bản / Vai trò | Mục đích sử dụng |
| :--- | :--- | :--- |
| **Node.js & Vite** | Vite v6.x (ES Modules) | Build tool, Bundler & Local Dev Server tốc độ cao, hỗ trợ HMR |
| **Three.js** | v0.174.x | Engine đồ họa 3D WebGL (Scene graph, Camera, PBR Materials, Lighting, ShadowMaps, GLTFLoader) |
| **Web Audio API** | Tích hợp trình duyệt | Bộ tổng hợp âm thanh thủ tục (Procedural Sound Synthesizer) không cần file ngoài (tiếng click lẫy RAM, tiếng siết ốc, còi Beep POST 880Hz, tiếng gió quạt, tiếng công tắc nguồn) |
| **Canvas Confetti** | v1.9.x | Hiệu ứng pháo hoa ăn mừng khi người dùng hoàn thành bước 12 và boot máy thành công |
| **CSS Glassmorphism** | Vanilla CSS3 | Giao diện hiện đại Cyber-tech, bo góc, bóng mờ backdrop blur, glowing neon cyan/amber accents |
| **Git & GitHub** | Version control | Quản lý mã nguồn, lưu trữ tại `https://github.com/giakhiemnguyen3011-sudo/PC-3D-Builder.git` |

---

## 3. HỆ THỐNG THƯ MỤC & TÀI NGUYÊN (DIRECTORY & ASSET STRUCTURE)

```
D:\pc-builder-3d\
├── index.html                     # Entry HTML chứa Canvas 3D, Crosshair, HUD và Modal Inventory
├── package.json                   # Cấu hình dependency (three, canvas-confetti, vite)
├── vite.config.js                 # Cấu hình máy chủ Vite
├── start.bat                      # Script double-click mở nhanh máy chủ và trình duyệt
├── PROJECT_CONTEXT.md             # File ngữ cảnh toàn diện cho AI & Developers
├── README.md                      # Hướng dẫn sử dụng cho người chơi
│
├── public\
│   └── models\                    # Mô hình 3D (.glb) của linh kiện, mỗi file đều đang được
│       │                          # source trỏ tới. Quét bằng: node .verify/audit-models-strict.mjs
│       ├── Motherboard_model\
│       │   └── motherboard_am4.glb
│       ├── CPU_model\
│       │   ├── cpu_ryzen_5_3600.glb
│       │   ├── intel_cpu.glb
│       │   ├── intel_cpu (1).glb
│       │   ├── am4_cpu__free.glb
│       │   ├── free__cpu_3d_model_hyper_9_9920g.glb
│       │   └── free_intel_cpu.glb
│       ├── CPU_Cooler_model\
│       │   ├── cooler_master_cpu_cooler.glb
│       │   ├── cpu_cooler.glb
│       │   └── cpu_cooler (1).glb
│       ├── RAM_model\
│       │   ├── ram_ddr4_g.skill_trident_z_rgb.glb
│       │   ├── kingston_hyperx_fury_black_ram_module.glb
│       │   ├── crucial_8_gb_ddr4_2133_ram.glb
│       │   └── random_access_memory_ram_ddr4.glb
│       ├── GPU_model\
│       │   ├── nvidia_geforce_rtx_3090_-_gpu.glb
│       │   ├── rx_480_gpu.glb
│       │   └── gold_graphics_card.glb
│       ├── SSD_model\
│       │   ├── samsung_ssd_2.5in_-_dirty.glb
│       │   ├── ssd_solid-state_drive.glb
│       │   └── ssd_solid_state_drive.glb
│       ├── PSU_model\
│       │   ├── power_supply_aerocool_kcas_500w_atx.glb
│       │   └── psu.glb
│       ├── PC_Case_model\
│       │   └── cabinet.glb          # Vỏ case thật, thay cho vỏ procedural
│       └── Peripherals_model\
│           ├── gigabyte_aorus_k1_rgb_gaming_keyboard.glb
│           ├── computer_mouse.glb
│           ├── damascus_mousepad.glb
│           └── asus_pc_gaming_monitor.glb
│
└── src\
    ├── main.js                    # Entry point khởi tạo Game engine và audio unlock
    ├── style.css                  # Toàn bộ CSS (HUD, Crosshair, Slot Grid, Detail panel, Toasts)
    │
    ├── audio\
    │   └── SoundEffects.js        # Synthesizer âm thanh Web Audio (click, drop, snap, screw, post beep, fan hum)
    │
    ├── controls\
    │   ├── PlayerControls.js      # Di chuyển WASD/Mũi tên, Shift-Lock, Mouse Look, Look-Lock, Raycasting
    │   └── HeldItemManager.js     # Quản lý vật phẩm cầm trên tay (First-person hand), RMB hold inspect 360°
    │
    ├── data\
    │   ├── hardware.js            # Cơ sở dữ liệu linh kiện (specs wiki, realSize, footprint, shelfTier, SVG icons)
    │   └── assemblyPlan.js        # Kế hoạch 12 bước lắp ráp (vị trí, linh kiện, hành động bắt buộc)
    │
    ├── scene\
    │   ├── Room.js                # Căn phòng xưởng, bàn gỗ trung tâm, màn hình 27" có canvas BIOS/OS, placeholder thùng máy
    │   ├── caseLayout.js          # Số đo thật của thùng ATX + CASE_ZONES (vị trí lắp, pattern ốc) - nguồn sự thật duy nhất
    │   ├── shelfLayout.js         # Hình học bàn gỗ + bố cục xếp linh kiện thành hàng (tự kéo dài khi cần)
    │   ├── ModelFit.js            # Quy đổi model về kích cước thực (mét) + tự xoay cho linh kiện nằm ngang & thẳng
    │   ├── BuildScene.js          # Build Zone tương tác: thùng x-ray 50%, vùng highlight, model theo con trỏ, ốc, cáp
    │   ├── ItemThumbnails.js      # Nướng ảnh PNG model 3D cho danh sách linh kiện
    │   ├── ShelfHardware.js       # Bố trí linh kiện vật lý 3D trên bàn gỗ, tải dần theo lô
    │   ├── PlacedItemManager.js   # Quản lý các vật phẩm bị thả/đặt ra bàn, sàn, kệ (nhặt lại được)
    │   └── ItemPreviewScene.js    # Khung nhìn 3D phụ trong Inventory, tự canh giữa + khung vừa khung
    │
    ├── ui\
    │   ├── InventoryUI.js         # Giao diện kho đồ 24 ô vuông, xem wiki specs, xem trước model 3D
    │   └── BuildModeUI.js         # Build Mode: điều phối 12 bước, danh sách linh kiện, ghim ốc/cáp, tiến trình POST
    │
    └── core\
        └── Game.js                # Bộ điều phối trung tâm tích hợp Scene, Render Loop, Collision, Event Dispatching
```

---

## 4. KÍCH THƯỚC THỰC TẾ & BỐ CỤC BÀN LINH KIỆN (REAL-WORLD SIZING & BENCH LAYOUT)

Do các model xuất từ phần mềm 3D (Blender/Maya/3ds Max/Sketchfab) có đơn vị và hướng đặt khác nhau (có model nằm sấp, có model đứng, có model lệch), hệ thống **không dùng `baseRotation` thủ công nữa**. Thay vào đó:

- **`realSize`** (mét) trong `hardware.js`: cạnh dài nhất thực tế của linh kiện, dùng làm **dự phòng** khi một linh kiện không có bảng kích thước riêng. CPU thật sự nhỏ hơn bo mạch chủ, GPU dài hơn ổ cứng.
- **`hardwareDims.js`**: kích thước thật **theo từng trục** cho từng loại linh kiện, và đây mới là nguồn chuẩn khi có. Bắt buộc vì các model tải về từ nhiều trang khác nhau **mâu thuẫn cả về hướng lẫn tỉ lệ**: cùng một thanh RAM, có bản native `133 × 3,5 × 31 mm` nhưng cũng có bản `2085 × 2017 × 5017 mm`. Nếu chỉ scale cạnh dài nhất, biến thể này ra một viên gạch 53 mm dày còn biến thể kia mới đúng là DIMM — đó chính là lý do RAM nằm ngang trong khi RAM khác đứng thẳng.
- **`footprint: { length, depth }`** (mét): diện tích chỗ để trên bàn. `length` chạy dọc theo bàn, `depth` chạy ngang bàn. Dùng để xếp hàng và tự kéo dài bàn.
- **`shelfTier`**: *(đã bỏ)*. Bàn chỉ có **một mặt làm việc ở 0,82 m**. Linh kiện nằm ở kệ dưới là linh kiện người chơi không với tới và không nhìn thấy, nên nay **không còn kệ dưới nào** (`table.tierSurfaces` chỉ có 1 phần tử). Khi danh mục dài lên, linh kiện được **xếp thành nhiều hàng cạnh nhau trên cùng mặt bàn** (`tiers[0].rows`), chứ không xếp xuống tầng dưới.
- **`ALL_HARDWARE_ITEMS`** = `HARDWARE_ITEMS` + `HARDWARE_VARIANTS`: **31 linh kiện**, phủ 29/32 model trong `public/models` (3 file `Decorative_model` chưa dùng; nhóm case dựng sẵn đã bị gỡ). 12 bước lắp ráp nhận linh kiện theo **`tag`** chứ không theo `id`, nên biến thể mới dùng được ngay mà không phải sửa `assemblyPlan.js`. Không còn nhóm carry-only: **mọi linh kiện đều lắp được** vào đúng bước của nó.
- **Tên linh kiện trên từng bước** (`stepPartNames` trong `assemblyPlan.js`): mỗi bước tiêu thụ linh kiện sẽ hiện tên thật của **một model cụ thể** lấy từ danh mục, kèm số lượng nếu bước cần nhiều (bước 5 → “G.SKILL Trident Z RGB 16GB × 2”). Trước đây bước 4 chỉ ghi “lắp tản khí”, bước 7 chỉ ghi “lắp bộ nguồn” — người mới lắp máy không biết phải đi tìm món nào trên bàn. Vì tên được tra ra từ danh mục sống nên không bao giờ lệch với danh sách model.
- **`hardwareCategories.js`**: tách riêng để `hardware.js` và `hardwareVariants.js` cùng dùng mà không import vòng.
- **`ModelFit.js`** (`buildFittedModel` + `computeFlatAlignment`): tự động
  1. đo bounding box gốc của model,
  2. chọn trục **mỏng nhất làm trục dọc** → linh kiện luôn *nằm ngang*, không bao giờ đứng bằng mũi,
  3. chọn trục **dài nhất làm trục X** → cạnh dài nằm song song với bàn,
  4. chọn phép hoán trục **ít xoay nhất** (kèm ưu tiên giữ mặt "ngửa lên") để model vốn đã nằm phẳng không bị lật,
  5. scale về kích thước thật: `realDims` nếu có (**theo từng trục**), nếu không mới dùng `realSize` (đồng nhất), rồi canh giữa theo X/Z và đặt sát mặt bàn (minY = 0).

   Thứ tự các node rất quan trọng: `root → scaleGroup → alignGroup → model`. Node scale **bao quanh** node xoay, nên phép scale theo trục được áp dụng trên hệ đã căn (trục X = cạnh dài nhất, Y = mỏng nhất, Z = phần còn lại) chứ không phải trên trục gốc của file. Nếu đảo hai node này, giá trị thật sẽ bị gán nhầm trục và mọi linh kiện lệch tỉ lệ.
- **`shelfLayout.js`** (`getShelfLayout`, `getTableObstacle`): hình học bàn và vị trí từng linh kiện. Chiều rộng bàn bị giới hạn ở `maxWidth` 1,3 m nên số hàng là `rowCount()`, **phần dài nhất xếp vào hàng đang ngắn nhất** (first-fit-decreasing) để các hàng cân nhau và bàn không bị một linh kiện dài kéo giãn; mỗi hàng nằm trong một dải cách nhau `rowGap`. Chiều dài bàn **tự kéo dài** theo hàng dài nhất. Kết quả dùng chung cho `Room.js` (dựng bàn), `ShelfHardware.js` (đặt linh kiện) và `PlayerControls.js` (va chạm). Hiện tại: bàn **2,38 × 1,10 m, 3 hàng, 31 linh kiện, không có mặt nào dưới 0,8 m**.

Kích thước thực tế đang dùng:

| Linh kiện | `realSize` | Ghi chú |
| :--- | :--- | :--- |
| Bo mạch chủ ATX | 0.305 m | 305 × 244 mm |
| CPU AMD Ryzen 5 3600 | 0.04 m | IHS 40 mm |
| CPU Intel i7-9700K | 0.0375 m | LGA1151 37.5 mm |
| Tản khí Cooler Master Hyper 212 | 0.154 m | 154 × 120 × 94 mm |
| RAM G.SKILL Trident Z RGB | 0.1334 m | DIMM 133.35 mm |
| RAM Corsair Dominator Platinum | 0.1334 m | DIMM 133.35 mm |
| SSD Samsung 860 EVO 2.5" | 0.1 m | 100 × 70 × 7 mm |
| Nguồn Aerocool MasterWatt 650W | 0.15 m | ATX 150 × 140 × 86 mm |
| Card đồ họa RTX 3090 FE | 0.313 m | 313 mm dài |
| Card đồ họa RX 480 | 0.24 m | 240 mm dài |

Cột `realSize` ở trên chỉ là **dự phòng**. Kích thước thật theo từng trục nằm ở `hardwareDims.js`:

| Loại | Dài × Rộng × Dày | Ghi chú |
|------|-------------------|---------|
| Motherboard ATX | 305 × 244 × 45 mm | 45 mm là gồm tản nhiệt VRM |
| Motherboard mATX | 244 × 244 × 45 mm | |
| CPU | 40 × 40 × 5 mm | mặt IHS |
| Tản khí tháp | 155 × 120 × 110 mm | kèm quạt |
| RAM DDR4 | 133,4 × 45 × 7 mm | 7 mm là bề dày PCB, 45 mm gồm tản |
| SSD 2,5" | 100 × 70 × 7 mm | |
| Nguồn ATX | 150 × 150 × 86 mm | |
| Card đồ họa | 313 × 130 × 52 mm | dài × cao × dày |

### 4.1. Placeholder thùng máy tính (Build Mode)
`createComputerCase3DGroup()` trong `Room.js` dựng thùng ATX mid-tower rỗng bằng hình khối thủ tục với kích thước vỏ thật **21 × 48 × 45 cm**. Toàn bộ số đo nằm trong **`caseLayout.js`** (nguồn sự thật duy nhất) nên vật thể trong phòng và Build Zone không bao giờ lệch nhau:
- Khung thép + tấm đáy, nắp trên **đục lỗ thật** cho quạt 140 mm bằng `ShapeGeometry`, tấm sau **đục lỗ** khoét tròn quạt xả 120 mm, cửa sổ I/O, 7 khe PCIe và khoang nguồn.
- Mặt trước: khung viền + tấm lưới đục lỗ `alphaTest` nhìn thấy 2 quạt hút 140 mm bên trong.
- **Khay bo mạch đặt lùi** (x = −50 mm) để có ~147 mm độ giãn cho tản khí tháp, để lại khe luồn cáp ~42 mm phía sau — đúng tỉ lệ thùng máy thật. Khay bị khuyết ở góc trên-sau để chừa chỗ cho quạt xả, nên chân ốc thực tế còn **8/9**.
- Tấm che nguồn (PSU shroud) kích thước **144 × 359 × 95 mm**, đủ chứa nguồn ATX 140 × 150 × 86 mm.
- **Nắp kính cường lực** (tên `sideGlass`) + 4 núm vặn đi kèm để tháo ra thành một khối.
- `{ xray: true }` biến toàn bộ vỏ thùng thành **trong suốt 50 %** (`transparent`, `depthWrite: false`) cho chế độ Build.

#### 4.2. Một phép biến đổi duy nhất cho toàn bộ thùng (`caseRoot`)

Thùng được xoay **−90° quanh Y** để mặt kính hướng về camera. Phép xoay đó nằm trên **`BuildScene.caseRoot`**, và **mọi** thứ đặt bên trong thùng đều là con của `caseRoot`:

```
pivot
└── caseRoot      ← rotation.y = -90°, position.y = -CASE.feet   (phép biến đổi DUY NHẤT)
    ├── caseGroup (thùng, giữ transform gốc case-local)
    ├── zoneMeshes, screwGroups, cableGroup   (case-local)
    ├── placedParts                            (case-local)
    └── ghost                                  (case-local)
```

Mọi `anchor` trong `caseLayout.js` viết theo **case-local**. Trước đây các vùng được gắn thẳng vào `pivot` trong khi thùng lại xoay −90°, nên **vùng lệch tối đa 30 cm** và linh kiện lắp vào nằm sát cạnh thùng thay vì nằm trong thùng. Hai hàm phải nói đúng một hệ toạ độ:

- `pointerWorld()` trả về **case-local** (dùng `caseRoot.worldToLocal`).
- `frameBox(box)` nhận box case-local rồi đưa sang pivot-space qua `caseRoot.matrixWorld` trước khi tính khung camera.

Hai điểm dễ sai khác, đã có test chặn (`verify-placement.mjs`):

- **`buildFittedModel` đặt linh kiện nằm trên `y = 0`** và chỉ canh giữa theo X/Z, đồng thời offset được bake vào `position` của chính group gốc. Nên **không** suy ra vị trí ngồi bằng đại số box → phải đo: `_centreOnAnchor()` đặt holder về gốc rồi lấy tâm `Box3` thật. Lỗi này làm card 44 mm nằm lệch 22 mm so với vị trí đã duyệt trong `caseLayout.js`.
- **Kẹp (clamp) ghost trong thùng** dùng `centre + half` của bounding box **đã gắn mount**, đo trong **case-local** (`Box3` trả về world-space, mà thùng lại xoay −90°). Offset tâm/half được đo **một lần cho mỗi zone** (`_applyGhostMount`) để không phải duyệt bounding box mỗi lần rê chuột.

Ba điểm dễ sai nữa, đều đã có test chặn (`verify-placement.mjs`):

- **Ốc phải mỗi lần bấm chỉ vặn đúng một con.** `hitScrew` đánh dấu `driven` sau khi vặn và bỏ qua con đó về sau; nếu không, "con gần con trỏ nhất" vẫn thắng dù nó đã vặn rồi, nên bấm một chỗ là xong cả bộ. Con đã vặn cũng **giữ nguyên ở trạng thái đã vặn** (thu nhỏ + tắt vòng sáng) thay vì bật lại 100%, vì nếu không người chơi thấy như không có gì xảy ra.
- **`hideScrews` phải gỡ khỏi `caseRoot`.** Nhóm ốc được thêm vào `caseRoot` (nơi chứa toàn bộ linh kiện trong thùng) nên phải gỡ khỏi đúng parent đó. Gỡ nhầm `pivot` là lỗi không hiện lỗi gì nhưng nhóm ốc **vẫn nằm trong scene** — đúng triệu chứng “bấm xong ốc vẫn còn”. `removePart` (dùng cho `reset()`) cũng dính lỗi này.
- Ghost chỉ chạy theo con trỏ khi `BuildModeUI.ghostArmed` đúng: đang siết ốc, bôi keo, ấn linh kiện, cắm cáp hay bấm nguồn thì ghost **ẩn đi**, tránh bay ra ngoài thùng.

### 4.3. Xoay 3 trục cho máy đã lắp ráp

Máy đã lắp ráp **không còn cờ `noTilt`**, nên có thể xoay cả 3 trục. Chuột chỉ cho 2 trục (yaw/pitch), nên **lăn chuột giữ lúc đang quan sát** sẽ xoay trục roll. Khi cất máy, `Game.rememberAssembledPose()` ghi lại `itemRotation` của tay rồi `parkAssembledPC()` dùng pose đó, và lúc cầm lại thì khôi phục đúng pose cũ — nên máy không bị “bật dậy” mỗi lần cất. `noTilt` vẫn còn cho **một linh kiệt rời** để không bị nghiêng nằm sấp trong tay.

### 4.2. Hệ thống Build Mode lắp ráp 12 bước
| File | Vai trò |
| :--- | :--- |
| `scene/caseLayout.js` | Toàn bộ số đo thật + `CASE_ZONES` (vị trí, hướng mặt, pattern ốc) cho từng vị trí lắp |
| `data/assemblyPlan.js` | Kế hoạch 12 bước: `zone`, `accepts` (id hoặc `tag:`), `need`, `action` |
| `scene/BuildScene.js` | Scene Build Zone: thùng x-ray, khung highlight vị trí, model ma theo con trỏ, ốc, đầu cáp |
| `scene/ItemThumbnails.js` | Nướng ảnh PNG model 3D cho danh sách linh kiện (1 offscreen WebGL context, có cache) |
| `ui/BuildModeUI.js` | Điều phối 12 bước, render danh sách, ghim/bỏ linh kiện, tiến trình POST |

Luồng chơi: chọn linh kiện ở danh sách → rê chuột trong Build Zone (model đi theo con trỏ, tự hút vào vùng highlight) → bấm chuột trái để cắm → làm tiếp **hành động bắt buộc** của bước đó:
`glass` (tháo/lắp nắp kính) · `screw` (bấm từng đầu ốc, số ốc lấy từ hình học thùng) · `paste` (bấm vào CPU để bôi keo, mới mở được ốc tản) · `seat` (bấm lần nữa để ấn linh kiện xuống / đóng chốt) · `cable` (bấm 4 đầu cáp màu cam) · `display` · `power`.

Camera tự glide tới đúng vị trí đang làm việc nên tạm CPU 4 cm vẫn thao tác được, nhưng **thùng không bao giờ xoay** (kính hướng thẳng về người chơi). `Làm lại` trả toàn bộ linh kiện đã lắp về túi.



---

## 5. CƠ CHẾ ĐIỀU KHIỂN & TƯƠNG TÁC (CONTROL MECHANICS)

### 5.1. Di chuyển & Góc nhìn
- **W / A / S / D hoặc 4 phím mũi tên**: Di chuyển đa hướng theo vector không gian thực của góc nhìn camera.
  - `A`: Di chuyển sang Trái (`-right`).
  - `D`: Di chuyển sang Phải (`+right`).
  - `W`: Di chuyển Tới (`+forward`).
  - `S`: Di chuyển Lùi (`-forward`).
- **Phím Shift**: Bật/Tắt Shift-Lock (khóa/mở con trỏ chuột). Mặc định là bật khi tải trang.
- **Tâm ngắm (Crosshair)**: Hiển thị liên tục ở giữa màn hình. Khi rê trúng vật thể có thể nhặt, bề mặt bàn hoặc socket thùng máy, tâm ngắm chuyển màu cyan rực rỡ và phóng to nhẹ.

### 5.2. Nhặt, Cầm và Thả đồ (LMB & RMB)
- **Chuột trái (LMB)**:
  - Khi tay trống: Nhấp vào vật thể trên bàn linh kiện hoặc trên bàn/sàn để nhặt lên tay.
  - Khi đang cầm vật thể:
    - Nếu nhắm vào vị trí lắp ráp trên thùng máy: Lắp ráp vào case.
    - Nếu nhắm vào bề mặt bàn hoặc sàn: Đặt/thả vật phẩm nằm ngay ngắn tại điểm nhắm của crosshair.
- **Giữ Chuột phải (RMB)**:
  - Tạm thời **khóa khả năng quay góc nhìn camera** của nhân vật (`isLookLocked = true`).
  - Đưa vật thể đang cầm mượt mà ra **chính giữa màn hình**.
  - Rê chuột để xoay vật thể 360° quanh trục Pitch/Yaw để quan sát chi tiết chân pin, khe cắm, tem nhãn.
  - Thả chuột phải: Mở khóa góc nhìn camera và đưa vật thể về vị trí cầm tay mặc định góc dưới bên phải.

### 5.3. Cất vào túi và Kho đồ RPG (Phím E & R)
- **Phím E khi đang cầm vật thể ngoài không gian**:
  - Ngay lập tức cất vật thể đang cầm vào ô trống đầu tiên trong Inventory.
- **Phím R**:
  - Mở/Đóng giao diện Kho đồ RPG (nền mờ `backdrop-filter: blur(20px)`).
  - Trình bày dạng **Dải ô vuông trống (24 ô)**:
    - Ô trống: Hiển thị viền nét đứt và dấu `+`.
    - Ô có đồ: Hiển thị hình ảnh minh họa SVG của linh kiện, tên và tag loại phần cứng.
  - **Nhấp chuột trái vào ô có đồ**:
    - Chọn ô đó (viền sáng neon).
    - Cột bên phải mở ra bảng chi tiết: Khung 3D tương tác xoay 360°, Tag phần cứng, Thông số kỹ thuật từ Wiki, Mẹo thực tế.
  - **Nhấp chuột trái lần nữa vào ô đang chọn**:
    - Bỏ chọn (Deselect), đóng bảng chi tiết.
  - **Nhấn phím E khi đang chọn một ô**:
    - Vứt linh kiện từ ô đó ra thế giới 3D theo hướng tâm ngắm crosshair.
    - Ô đó trở thành ô trống.

---

## 6. QUY TRÌNH 12 BƯỚC LẮP RÁP (ASSEMBLY SEQUENCE)
1. Tháo nắp kính cường lực thùng case (`GlassSide`).
2. Lắp Bo mạch chủ ASUS ROG STRIX vào chân ốc đồng.
3. Lắp CPU AMD Ryzen vào socket AM4 đúng tam giác vàng.
4. Bôi keo tản nhiệt và lắp Tháp tản nhiệt khí Cooler Master.
5. Cắm thanh RAM G.SKILL Trident Z RGB vào khe Dual-Channel.
6. Lắp ổ cứng thể rắn SSD Samsung 860 EVO.
7. Lắp bộ nguồn PSU vào hộc đáy thùng máy.
8. Lắp Card đồ họa NVIDIA RTX 3090 vào khe PCIe x16.
9. Cắm hệ thống dây nguồn 24-Pin, 8-Pin CPU, PCIe và cáp công tắc.
10. Đóng nắp kính cường lực bảo vệ thùng máy.
11. Cắm cáp màn hình DisplayPort vào Card đồ họa & cắm dây nguồn AC.
12. **Bật nút nguồn (Power On)**: Hệ thống quạt quay, đèn RGB đổi màu, còi beep POST vang lên, màn hình khởi động BIOS POST và nạp PC Builder OS thành công kèm pháo hoa chúc mừng.

## 9. TỐI ƯU TỐC ĐỘ TẢI (LOADING PERFORMANCE)

Tài liệu GLB nặng **303 MB / 32 file**; một phiên chơi tải **238 MB** (3 file `Decorative_model` không được gọi nên không tải). Ba quy tắc giúp phần tải nhanh hơn nhiều lần:

1. **`ModelCache.js` — mỗi file chỉ parse MỘT lần.** Trước đây có **4 `GLTFLoader` riêng biệt** (`ShelfHardware`, `BuildScene`, `ItemPreviewScene`, `ItemThumbnails`) cộng thêm một loader trong `HeldItemManager`, nên một model có thể bị parse 4–5 lần ở các màn hình khác nhau. Giờ tất cả đều gọi `loadModelCopy(modelPath)`, trả về `clone()` của scene đã parse. `clone()` chỉ sao chép cây node, không sao chép lại buffer, nên rẻ hơn nhiều so với parse lại một file 30 MB.

2. **Bàn hiện đủ ngay, tải theo lô.** `ShelfHardware.seedPlaceholders()` đặt ngay một hộp xám mờ cho tất cả linh kiện (đồng bộ, không tốn thời gian), rồi `streamModels()` tải từng file và thay hộp bằng model thật khi file xong. Màn hình loading chỉ dùng để báo tiến độ và **tự ẩn ngay khi phần đầu tiên model về** (`Game.setLoadingProgress`, ngưỡng 12%), thay vì phải đợi tải hết.

3. **Thumbnail chỉ bake phần phù hợp.** `toDataURL()` là lệnh đọc GPU → CPU, rất nặng. Danh sách slot chỉ bake **linh kiện mà bước hiện tại dùng được** (thường 2–3 cái), các mục còn lại giữ hình ký tự danh mục; đồng thời **warm sẵn** cho bước kế tiếp để sẵn sàng khi cần.

`streamModels` nghỉ giữa các lô bằng `setTimeout`, **không dùng `requestAnimationFrame`**: rAF dừng hẳn khi chuyển tab, sẽ làm hàng đợi tải dừng dở.

---


## 10. TỐI ƯU FPS KHI CHƠI (RUNTIME PERFORMANCE)

### 10.1. Đo trước, đừng đoán

Phòng này **rất nhẹ về hình học**: 198 mesh, **6.638 tam giác**, 5 nguồn sáng. Đo được:

| Hạng mục | Chi phí/khung |
|---|---|
| Raycast chuột ngắm | **~1,0 ms** |
| Phần còn lại của vòng `animate()` | ~0,48 ms |
| **Tổng script mỗi khung** | **~1,44 ms / 16,67 ms = 8,6%** |

Nghĩa là **chỉ 8,6% thời gian khung nằm ở script**, phần còn lại là GPU. Bóp hình học (LOD, giảm mesh, instancing) gần như vô nghĩa ở đây.

> **Đã thử rồi gỡ: tự co giản độ phân giải.** Có thể giảm `setPixelRatio` 2x → 1x (mất 3/4 số pixel tô màu) để giữ 45 fps. Nhưng người chơi phản ánh **ảnh bị mờ**, và đó là đánh đổi không chấp nhận được với một cảnh tĩnh như thế này. **Chất lượng hình ảnh được giữ nguyên**: `setPixelRatio(min(devicePixelRatio, 2))` cố định, bóng đổ **2048 + PCFSoft**, màn hình POST vẽ lại mỗi khung. Đừng thêm lại trừ khi có yêu cầu rõ ràng từ người chơi.

### 10.2. Những gì đang giữ (không đổi hình ảnh)

1. **Bóng đổ không vẽ lại mỗi khung.** Mặc định của three.js là vẽ lại toàn bộ depth map 60 lần/giây dù phòng gần như đứng yên. `shadowMap.autoUpdate = false` và chỉ vẽ lại **mỗi 4 khung** (15 Hz), kèm `Game.markWorldChanged()` để nhặt/thả vẫn có bóng đúng ngay khung kế tiếp. **Ảnh bóng y hệt cũ** — cùng bộ lọc PCFSoft, cùng bản đồ 2048 — chỉ khác là không vẽ lại 15 lần/giây một cách vô ích.

2. **Raycast chuột ngắm chỉ chạy khi cần.** Đệ quy trên 56 mesh mỗi khung là phần tốn nhất của script, nhưng kết quả chỉ đổi khi **camera hoặc thế giới thay đổi**. `PlayerControls` so vị trí + quaternion với lần đo trước và bỏ qua nếu không đổi; `Game.markWorldChanged()` báo khi có linh kiện xuất hiện/biến mất. Đo lại: **1,44 ms → 0,006 ms** khi đứng yên, **0,073 ms** khi quét qua bàn.

3. **Cấp phát sẵn và ghi DOM có điều kiện.** `update()` dùng lại 3 `Vector3` thay vì tạo mới mỗi khung; các node HUD được tra một lần rồi **chỉ ghi khi giá trị thực sự đổi** (ghi `textContent`/`style` mỗi khung làm hỏng style/layout cả trang).

### 10.3. Bẫy: danh sách mục tiêu raycast KHÔNG được cache theo độ dài

`Game.getRaycastTargets()` gộp `shelf.interactables`, `placedItems.interactables`, `room.interactables` và `room.surfaces` thành **một mảng, nạp lại mỗi khung**.

**Không được cache lại theo độ dài.** `ShelfHardware._swapIn()` gỡ placeholder và đẩy model thật vào *cùng một bước*, nên **độ dài mảng không đổi**. Bản cache trước đây vì thế giữ nguyên các placeholder đã bị `dispose()`, và triệu chứng là **không cầm được linh kiện nào** — chuột ngắm không có gì để trỏ tới. Đừng "tối ưu" lại chỗ này; nạp lại vài chục phần tử không tốn gì đáng kể, và raycast nó nuôi vốn đã được chặn riêng ở mục 10.2.2.

### 10.4. Hai lỗi thật tìm ra khi tối ưu

- **Linh kiện đã nhặt vẫn bắt được.** `ShelfHardware.hideItem()` chỉ đặt `visible = false`, mà three.js r174 **vẫn raycast cả object đang ẩn** (đã kiểm chứng: 2 hit ở cả hai trạng thái). Nay vòng duyệt hit bỏ qua mọi object có cha/con không hiển thị (`isVisibleChain`).
- **Tia ngắm trễ một khung.** `setFromCamera` cần `matrixWorld` của camera, mà nó chỉ được cập nhật trong `renderer.render()` — tức là **sau** khi raycast đã chạy. Nay `update()` gọi `camera.updateMatrixWorld()` trước.

`verify-performance.mjs` (20 test) chặn cả hai lỗi này, chặn luôn bẫy ở 10.3, và xác nhận các thiết lập chất lượng hình ảnh ở 10.1 không bị đụng vào.

Lưu ý khi đo: `Raycaster` biến động thời gian rất lớn giữa các lần chạy (đo sạch thấy 0,03–0,20 ms), nên đừng kết luận từ một lần chạy đơn lẻ.

## 11. CHIẾN MỤC LINH KIỆN, XOAY GÓC NHÌN BUILD MODE & VỎ MÁY TRẮNG

Ba thay đổi mới:

1. **Chỉ còn hai bo mạch chủ trong mô phỏng** (`src/data/hardware.js` + `src/data/hardwareVariants.js`): `mb_msi_b550_tomahawk` (file `motherboard_am4.glb`) và `mb_gigabyte_h61` (file `motherbard.glb`). Bỏ `mb_asus_z370`, `mb_asus_prime_b450`, `mb_asrock_z690`, `mb_generic_atx` và ma trận `mb_asus_prime_b450` trong `hardwareDims.js`. Tổng số linh kiện giảm 31 → 27. Mọi bước lắp ráp nhận linh kiện theo `tag:Motherboard` nên hai board còn lại vẫn dùng được; bài test `verify-integration` phải trỏ theo `id` thay vì chỉ số điểm mốc trong mảng khi mất bớt phần tử khỏi `ALL_HARDWARE_ITEMS`.

2. **Thay vòng xoay thùng máy bằng xoay góc nhìn camera** (tham khảo `BuildScene.orbitYaw/orbitPitch`, `beginOrbit/orbitBy/endOrbit`, `resetView` + `setViewBadge` trong BuildModeUI). Chuột phải kéo để xoay quanh thùng, lăn chuột để phóng to (bước phóng to giữ nguyên hướng nhìn hiện tại nhờ `frameBox`), phím Home đưa về góc nhìn mặc định. Ý định ban đầu là xoay *thùng máy*, nhưng người dùng thấy quan sát góc nhìn tự nhiên hơn; mã `spin`/`caseTurn` và `measureTurnCentre` đã gỡ. Lưu ý: `CASE_BOUNDS` là hộp bao kích thước *theo bố cục*, còn`caseGroup` dựng theo trục khác (450×220 so với 210×450), vì vậy không được dùng `CASE_BOUNDS` làm tâm xoay hay đo đạc hình học thật. Hai lỗi bố trí bo mạch/CPU trong ảnh chụp (`Afterfix bug1/2.PNG`) vẫn **chưa sửa** theo yêu cầu.

3. **Vỏ thùng màu trắng cho độ tương phản** (cả trường hợp hộp placeholder trong phòng và trong Build Mode 50% x-ray): `steel/steelTwoSided/steelInner/trim/dark/rubber/blade/grille` được đổi từ tông đen sáng lên tông trắng/đồng xám (`0xf5f5f4`/`0xe7e5e4`/`0xd6d3d1`/`0xcbd5e1`). Các chi tiết cổng kết nối phía sau (`0x1d4ed8`, `0x334155`) cố tình giữ màu tối để nhận biết. Bóng đổ vẫn giữ: `PCFSoft` + 2048 + autoUpdate mỗi 4 khung.