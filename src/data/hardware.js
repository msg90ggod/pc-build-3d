/**
 * Hardware Components Database
 * Contains realistic technical specifications, tags, 3D model paths, educational notes,
 * real-world dimensions in metres, and crisp SVG icons for Inventory slots.
 *
 * Sizing contract:
 *   realSize   - the longest real-world edge of the part, in metres. Every mesh is
 *                scaled so its bounding box matches this, so a 0.04 CPU really is
 *                4 cm wide next to a 0.305 ATX board.
 *   footprint  - real-world length/depth (metres) reserved on the bench. `length`
 *                runs along the bench, `depth` across it. Used to lay items out
 *                in rows and to auto-grow the bench.
 *
 * Every part is displayed on the bench top; the layout wraps them into rows, so
 * there is no tier to assign.
 */

import { HARDWARE_CATEGORIES } from './hardwareCategories.js';
import { HARDWARE_VARIANTS } from './hardwareVariants.js';

export const HARDWARE_ITEMS = [
  {
    id: 'cpu_ryzen_3600',
    name: 'AMD Ryzen 5 3600 Processor',
    category: HARDWARE_CATEGORIES.CPU,
    categoryKey: 'cpu',
    tag: 'CPU',
    modelPath: '/models/CPU_model/cpu_ryzen_5_3600.glb',
    brand: 'AMD',
    price: '3,290,000 đ',
    realSize: 0.04,
    footprint: { length: 0.04, depth: 0.04 },
    iconSvg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="44" height="44" rx="4" fill="#14532d" stroke="#4ade80" stroke-width="2"/>
      <rect x="18" y="18" width="28" height="28" rx="3" fill="#64748b" stroke="#cbd5e1" stroke-width="2"/>
      <circle cx="23" cy="23" r="2" fill="#fbbf24"/>
      <text x="32" y="35" font-size="7" font-family="sans-serif" font-weight="bold" fill="#ffffff" text-anchor="middle">RYZEN</text>
      <path d="M10 16h-4M10 24h-4M10 32h-4M10 40h-4M10 48h-4" stroke="#fbbf24" stroke-width="2"/>
      <path d="M54 16h4M54 24h4M54 32h4M54 40h4M54 48h4" stroke="#fbbf24" stroke-width="2"/>
    </svg>`,
    specs: [
      { label: 'Số nhân / Số luồng', value: '6 Nhân / 12 Luồng (Zen 2)' },
      { label: 'Xung nhịp cơ bản', value: '3.6 GHz (Tăng tốc tối đa 4.2 GHz)' },
      { label: 'Tiến trình chế tạo', value: 'TSMC 7nm FinFET' },
      { label: 'Bộ nhớ đệm L3', value: '32MB GameCache' },
      { label: 'Điện năng tiêu thụ (TDP)', value: '65 Watts' },
      { label: 'Chuẩn Socket', value: 'AMD Socket AM4' },
      { label: 'Phiên bản PCIe', value: 'PCIe 4.0 x16 Ready' },
      { label: 'Hỗ trợ RAM', value: 'DDR4 Dual-Channel lên tới 3200MHz' }
    ],
    description: 'Bộ vi xử lý quốc dân với hiệu năng đa nhân vượt trội, cân bằng hoàn hảo giữa chơi game eSports và làm việc đồ họa mượt mà.',
    beginnerTip: '💡 Khi lắp CPU, hãy tìm biểu tượng tam giác vàng ở góc con chip và căn trùng khớp với dấu tam giác trên socket. Nhẹ nhàng đặt xuống, tuyệt đối không dùng lực đè mạnh!'
  },
  {
    id: 'cpu_intel',
    name: 'Intel Core i7-9700K Processor',
    category: HARDWARE_CATEGORIES.CPU,
    categoryKey: 'cpu',
    tag: 'CPU',
    modelPath: '/models/CPU_model/intel_cpu.glb',
    brand: 'Intel',
    price: '4,190,000 đ',
    realSize: 0.0375,
    footprint: { length: 0.0375, depth: 0.0375 },
    iconSvg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="10" width="44" height="44" rx="4" fill="#0369a1" stroke="#38bdf8" stroke-width="2"/>
      <rect x="18" y="18" width="28" height="28" rx="3" fill="#64748b" stroke="#cbd5e1" stroke-width="2"/>
      <text x="32" y="35" font-size="7" font-family="sans-serif" font-weight="bold" fill="#ffffff" text-anchor="middle">INTEL</text>
    </svg>`,
    specs: [
      { label: 'Cores/Threads', value: '8 Cores / 8 Threads' },
      { label: 'Socket', value: 'LGA 1151' }
    ],
    description: 'Bộ vi xử lý hiệu năng cao từ Intel.',
    beginnerTip: '💡 Đặt cẩn thận vào socket.'
  },
  {
    id: 'cooler_master_212',
    name: 'Cooler Master Hyper Black Edition',
    category: HARDWARE_CATEGORIES.COOLER,
    categoryKey: 'cooler',
    tag: 'CPU Cooler',
    modelPath: '/models/CPU_Cooler_model/cooler_master_cpu_cooler.glb',
    brand: 'Cooler Master',
    price: '890,000 đ',
    realSize: 0.154,
    footprint: { length: 0.154, depth: 0.12 },
    iconSvg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="10" width="36" height="38" rx="4" fill="#1e293b" stroke="#a855f7" stroke-width="2"/>
      <circle cx="32" cy="29" r="13" stroke="#c084fc" stroke-width="2"/>
      <circle cx="32" cy="29" r="3.5" fill="#fbbf24"/>
      <path d="M32 16v8M32 34v8M19 29h8M37 29h8" stroke="#c084fc" stroke-width="2" stroke-linecap="round"/>
      <path d="M20 48v8M28 48v8M36 48v8M44 48v8" stroke="#f97316" stroke-width="2.5"/>
    </svg>`,
    specs: [
      { label: 'Dạng tản nhiệt', value: 'Tháp tản nhiệt khí (Single Tower Heatsink)' },
      { label: 'Ống dẫn nhiệt (Heatpipes)', value: '4 ống đồng Direct Contact 6mm mạ niken' },
      { label: 'Kích thước quạt', value: '120 x 120 x 25 mm Silencio FP' },
      { label: 'Tốc độ quay quạt', value: '650 - 2,000 RPM (PWM) ± 10%' },
      { label: 'Lưu lượng gió tối đa', value: '59 CFM, Áp suất khí 2.1 mmH2O' },
      { label: 'Độ ồn hoạt động', value: '8 - 30 dBA (Vận hành cực êm)' },
      { label: 'Socket tương thích', value: 'Intel LGA 1700/1200/115x & AMD AM4/AM5' }
    ],
    description: 'Giải pháp làm mát khí kinh điển với các lá tản nhiệt nhôm mạ niken tối ưu khí động học và cụm tiếp xúc 4 ống đồng nguyên chất.',
    beginnerTip: '💡 Đừng quên bôi một lượng keo tản nhiệt (cỡ hạt đậu) lên giữa nắp lưng CPU trước khi siết ốc tản nhiệt để truyền nhiệt tốt nhất!'
  },
  {
    id: 'ram_gskill_tridentz_16gb',
    name: 'G.SKILL Trident Z RGB 16GB (2x8GB) DDR4',
    category: HARDWARE_CATEGORIES.RAM,
    categoryKey: 'ram',
    tag: 'RAM',
    modelPath: '/models/RAM_model/ram_ddr4_g.skill_trident_z_rgb.glb',
    brand: 'G.SKILL',
    price: '1,750,000 đ',
    realSize: 0.1334,
    footprint: { length: 0.1334, depth: 0.051 },
    iconSvg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="18" width="48" height="28" rx="3" fill="#0f172a" stroke="#ec4899" stroke-width="2"/>
      <rect x="10" y="20" width="44" height="6" rx="2" fill="url(#rgbGrad)"/>
      <rect x="14" y="30" width="8" height="10" fill="#334155"/>
      <rect x="26" y="30" width="8" height="10" fill="#334155"/>
      <rect x="38" y="30" width="8" height="10" fill="#334155"/>
      <path d="M12 46v4M16 46v4M20 46v4M24 46v4M36 46v4M40 46v4M44 46v4M48 46v4" stroke="#fbbf24" stroke-width="1.5"/>
      <defs>
        <linearGradient id="rgbGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stop-color="#38bdf8"/>
          <stop offset="50%" stop-color="#ec4899"/>
          <stop offset="100%" stop-color="#fbbf24"/>
        </linearGradient>
      </defs>
    </svg>`,
    specs: [
      { label: 'Dung lượng bộ nhớ', value: '16GB (Kit 2 thanh x 8GB)' },
      { label: 'Chuẩn RAM', value: 'DDR4 Unbuffered DIMM' },
      { label: 'Tốc độ Bus RAM', value: '3200 MHz (PC4-25600)' },
      { label: 'Độ trễ Timing (CAS)', value: 'CL16-18-18-38' },
      { label: 'Điện áp danh định', value: '1.35V' },
      { label: 'Cấu hình ép xung', value: 'Intel XMP 2.0 (Extreme Memory Profile)' },
      { label: 'Hiệu ứng ánh sáng', value: 'LED RGB Dynamic Flow 5 vùng sáng' },
      { label: 'Chất liệu tản nhiệt', value: 'Hợp kim nhôm xước hairline cao cấp' }
    ],
    description: 'Thanh RAM cao cấp hàng đầu thế giới với dải LED RGB cầu vồng sống động cùng IC được tuyển chọn kỹ lưỡng cho khả năng ép xung tối đa.',
    beginnerTip: '💡 Khi cắm 2 thanh RAM trên bo mạch chủ có 4 khe, hãy cắm vào khe 2 và khe 4 (khe DIMM A2 & B2) để kích hoạt chế độ Kênh Đôi (Dual-Channel) giúp tăng gấp đôi băng thông nhớ!'
  },
  {
    id: 'ram_gskill_tridentz_16gb_b',
    name: 'G.SKILL Trident Z RGB 16GB (2x8GB) DDR4 - Kit B',
    category: HARDWARE_CATEGORIES.RAM,
    categoryKey: 'ram',
    tag: 'RAM',
    modelPath: '/models/RAM_model/ram_ddr4_g.skill_trident_z_rgb.glb',
    brand: 'G.SKILL',
    price: '1,750,000 đ',
    realSize: 0.1334,
    footprint: { length: 0.1334, depth: 0.051 },
    iconSvg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="18" width="48" height="28" rx="3" fill="#0f172a" stroke="#ec4899" stroke-width="2"/>
      <rect x="10" y="20" width="44" height="6" rx="2" fill="#38bdf8"/>
      <rect x="14" y="30" width="8" height="10" fill="#334155"/>
      <rect x="26" y="30" width="8" height="10" fill="#334155"/>
      <rect x="38" y="30" width="8" height="10" fill="#334155"/>
      <path d="M12 46v4M16 46v4M20 46v4M24 46v4M36 46v4M40 46v4M44 46v4M48 46v4" stroke="#fbbf24" stroke-width="1.5"/>
    </svg>`,
    specs: [
      { label: 'Dung lượng bộ nhớ', value: '16GB (Kit 2 thanh x 8GB)' },
      { label: 'Chuẩn RAM', value: 'DDR4 Unbuffered DIMM' },
      { label: 'Tốc độ Bus RAM', value: '3200 MHz (PC4-25600)' },
      { label: 'Độ trễ Timing (CAS)', value: 'CL16-18-18-38' },
      { label: 'Hiệu ứng ánh sáng', value: 'LED RGB Dynamic Flow 5 vùng sáng' }
    ],
    description: 'Kit RAM DDR4 thứ hai cùng series để ghép thành cặp kênh đôi hoàn chỉnh trong cùng một bộ máy.',
    beginnerTip: '💡 Nên dùng hai thanh cùng brand, cùng bus, cùng timing để kênh đôi chạy ổn định nhất.'
  },
  {
    id: 'ssd_samsung_860',
    name: 'Samsung 860 EVO 500GB 2.5" SATA III',
    category: HARDWARE_CATEGORIES.STORAGE,
    categoryKey: 'storage',
    tag: 'Storage',
    modelPath: '/models/SSD_model/samsung_ssd_2.5in_-_dirty.glb',
    brand: 'Samsung',
    price: '1,450,000 đ',
    realSize: 0.1,
    footprint: { length: 0.1, depth: 0.07 },
    iconSvg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="12" y="10" width="40" height="44" rx="4" fill="#1e293b" stroke="#0ea5e9" stroke-width="2"/>
      <rect x="26" y="24" width="12" height="12" fill="#f97316"/>
      <text x="32" y="44" font-size="6" font-family="sans-serif" font-weight="bold" fill="#ffffff" text-anchor="middle">SAMSUNG</text>
      <rect x="20" y="10" width="24" height="3" fill="#fbbf24"/>
    </svg>`,
    specs: [
      { label: 'Dung lượng lưu trữ', value: '500 GB' },
      { label: 'Kích thước Form Factor', value: '2.5 inch (Độ dày 6.8 mm)' },
      { label: 'Giao tiếp kết nối', value: 'SATA III 6Gb/s' },
      { label: 'Tốc độ đọc tuần tự', value: 'Lên tới 550 MB/s' },
      { label: 'Tốc độ ghi tuần tự', value: 'Lên tới 520 MB/s' },
      { label: 'Công nghệ NAND Flash', value: 'Samsung V-NAND 3-bit MLC (3D TLC)' },
      { label: 'Bộ điều khiển Controller', value: 'Samsung MJX Controller' },
      { label: 'Độ bền ghi (TBW)', value: '300 TBW (Bảo hành 5 năm)' }
    ],
    description: 'Ổ cứng SSD thể rắn huyền thoại từ Samsung đem lại độ bền bỉ phi thường, khởi động hệ điều hành và tải ứng dụng chỉ trong chớp mắt.',
    beginnerTip: '💡 Ổ cứng SSD không có bộ phận chuyển động cơ học nên chống sốc cực tốt và hoàn toàn im lặng. Kết nối cáp dữ liệu SATA từ ổ cứng vào bo mạch chủ và cáp nguồn từ PSU!'
  },
  {
    id: 'gpu_rtx_3090',
    name: 'NVIDIA GeForce RTX 3090 Founders Edition',
    category: HARDWARE_CATEGORIES.GPU,
    categoryKey: 'gpu',
    tag: 'GPU',
    modelPath: '/models/GPU_model/nvidia_geforce_rtx_3090_-_gpu.glb',
    brand: 'NVIDIA',
    price: '34,900,000 đ',
    realSize: 0.313,
    footprint: { length: 0.313, depth: 0.15 },
    iconSvg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="16" width="52" height="32" rx="4" fill="#0f172a" stroke="#22c55e" stroke-width="2"/>
      <circle cx="22" cy="32" r="10" stroke="#4ade80" stroke-width="2"/>
      <circle cx="22" cy="32" r="3" fill="#22c55e"/>
      <circle cx="44" cy="32" r="10" stroke="#4ade80" stroke-width="2"/>
      <circle cx="44" cy="32" r="3" fill="#22c55e"/>
      <rect x="14" y="48" width="24" height="4" fill="#fbbf24"/>
      <rect x="4" y="12" width="3" height="40" fill="#94a3b8"/>
    </svg>`,
    specs: [
      { label: 'Nhân đồ họa CUDA', value: '10,496 CUDA Cores' },
      { label: 'Bộ nhớ VRAM', value: '24 GB GDDR6X (Băng thông 936 GB/s)' },
      { label: 'Độ rộng băng thông bus', value: '384-bit' },
      { label: 'Xung nhịp Boost Clock', value: '1.70 GHz' },
      { label: 'Công nghệ AI & Ray Tracing', value: 'RT Cores Gen 2 & Tensor Cores Gen 3 (DLSS)' },
      { label: 'Công suất tiêu thụ TDP', value: '350 Watts' },
      { label: 'Nguồn phụ yêu cầu', value: '2x 8-Pin PCIe (Khuyến nghị nguồn > 750W)' },
      { label: 'Cổng xuất hình', value: '1x HDMI 2.1, 3x DisplayPort 1.4a' }
    ],
    description: 'Quái thú đồ họa (BFGPU) đỉnh cao nhất thế giới cho phép trải nghiệm game mượt mà ở độ phân giải 8K HDR và dựng hình 3D, Render video chuyên nghiệp.',
    beginnerTip: '💡 Card đồ họa rất nặng và tiêu thụ nhiều điện. Hãy lắp vào khe PCIe x16 trên cùng gần CPU nhất để đạt tốc độ tối đa, siết chặt ốc giữ ở thành case và cắm đủ nguồn 8-Pin PCIe!'
  },
  {
    id: 'gpu_rx_480',
    name: 'AMD Radeon RX 480 8GB GDDR5',
    category: HARDWARE_CATEGORIES.GPU,
    categoryKey: 'gpu',
    tag: 'GPU',
    modelPath: '/models/GPU_model/rx_480_gpu.glb',
    brand: 'AMD',
    price: '2,990,000 đ',
    realSize: 0.24,
    footprint: { length: 0.24, depth: 0.135 },
    iconSvg: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="16" width="52" height="32" rx="4" fill="#14532d" stroke="#4ade80" stroke-width="2"/>
    </svg>`,
    specs: [
      { label: 'VRAM', value: '8GB GDDR5' },
      { label: 'Bus', value: '256-bit' }
    ],
    description: 'Card đồ họa tầm trung bền bỉ.',
    beginnerTip: '💡 Lắp vào khe PCIe x16.'
  }
];

/**
 * Every model shipped in public/models is catalogued, so the parts table and the
 * inventory can offer real choice at each slot. The 12 assembly steps accept
 * hardware by `tag`, which is why the variants drop straight in.
 */
export const ALL_HARDWARE_ITEMS = [...HARDWARE_ITEMS, ...HARDWARE_VARIANTS];

export { HARDWARE_CATEGORIES, HARDWARE_VARIANTS };
