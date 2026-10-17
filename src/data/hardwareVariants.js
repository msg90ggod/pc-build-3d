import { HARDWARE_CATEGORIES } from './hardwareCategories.js';

/**
 * Extra hardware variants, one for every model in public/models that the base
 * catalogue in hardware.js does not use yet.
 *
 * The assembly plan accepts parts by `tag`, not by id, so these all drop into
 * the existing steps and give the player a real choice at each slot: the one
 * AM4 board the build zone is laid out for, any IHS-sized CPU, any tower
 * cooler, any DDR4 DIMM, and so on.
 *
 * Sizing contract is identical to hardware.js: `realSize` is the longest real
 * edge in metres and `footprint` reserves bench space for the part. Every part
 * is displayed on the bench top; the layout decides which row it lands in.
 */

// Per-category slot art, reused so every variant is instantly recognisable in
// the inventory grid without 20 near-identical blocks of inline SVG.
const ICONS = {
  motherboard: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="6" width="52" height="52" rx="4" fill="#0f172a" stroke="#38bdf8" stroke-width="2"/>
      <rect x="14" y="14" width="16" height="16" rx="2" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
      <rect x="18" y="18" width="8" height="8" fill="#fbbf24"/>
      <rect x="36" y="14" width="4" height="24" rx="1" fill="#38bdf8"/>
      <rect x="44" y="14" width="4" height="24" rx="1" fill="#38bdf8"/>
      <rect x="14" y="38" width="34" height="6" rx="1" fill="#22c55e"/>
      <rect x="14" y="48" width="24" height="4" rx="1" fill="#a855f7"/>
    </svg>`,
  cpu: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="14" y="14" width="36" height="36" rx="3" fill="#1e293b" stroke="#fbbf24" stroke-width="2"/>
      <rect x="20" y="20" width="24" height="24" rx="2" fill="#334155" stroke="#94a3b8" stroke-width="1"/>
      <path d="M20 14v-4M28 14v-4M36 14v-4M44 14v-4M20 50v4M28 50v4M36 50v4M44 50v4" stroke="#fde68a" stroke-width="2"/>
      <path d="M14 26l-4 6 4 6M50 26l4 6-4 6" stroke="#fbbf24" stroke-width="2" fill="none"/>
    </svg>`,
  cooler: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="18" y="10" width="28" height="30" rx="3" fill="#334155" stroke="#94a3b8" stroke-width="2"/>
      <circle cx="32" cy="25" r="11" stroke="#e2e8f0" stroke-width="2"/>
      <circle cx="32" cy="25" r="3" fill="#94a3b8"/>
      <path d="M32 14v6M32 30v6M21 25h6M37 25h6" stroke="#e2e8f0" stroke-width="2"/>
      <rect x="16" y="40" width="32" height="6" rx="2" fill="#1e293b" stroke="#94a3b8" stroke-width="1.5"/>
      <path d="M20 52h8M36 52h8" stroke="#fbbf24" stroke-width="3" stroke-linecap="round"/>
    </svg>`,
  ram: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="22" width="52" height="20" rx="2" fill="#0f172a" stroke="#a855f7" stroke-width="2"/>
      <rect x="10" y="16" width="44" height="6" rx="3" fill="#c084fc"/>
      <rect x="12" y="26" width="10" height="12" fill="#1e293b"/>
      <rect x="28" y="26" width="10" height="12" fill="#1e293b"/>
      <rect x="44" y="26" width="8" height="12" fill="#1e293b"/>
      <path d="M10 42v4M20 42v4M30 42v4M40 42v4M50 42v4" stroke="#fbbf24" stroke-width="2"/>
    </svg>`,
  ssd: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="8" y="20" width="48" height="24" rx="3" fill="#1e293b" stroke="#38bdf8" stroke-width="2"/>
      <rect x="12" y="24" width="26" height="16" rx="2" fill="#0ea5e9"/>
      <path d="M44 28h8M44 34h8" stroke="#94a3b8" stroke-width="2"/>
      <path d="M14 14h36v6H14z" fill="#1e293b" stroke="#38bdf8" stroke-width="1.5"/>
    </svg>`,
  psu: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="10" y="12" width="44" height="40" rx="4" fill="#0f172a" stroke="#f97316" stroke-width="2"/>
      <circle cx="32" cy="32" r="14" stroke="#fb923c" stroke-width="1.5" stroke-dasharray="3 3"/>
      <circle cx="32" cy="32" r="4" fill="#f97316"/>
      <rect x="14" y="16" width="6" height="4" fill="#ef4444"/>
      <path d="M46 16v12M50 16v12" stroke="#fbbf24" stroke-width="1.5"/>
    </svg>`,
  gpu: `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect x="6" y="16" width="52" height="32" rx="4" fill="#0f172a" stroke="#22c55e" stroke-width="2"/>
      <circle cx="22" cy="32" r="10" stroke="#4ade80" stroke-width="2"/>
      <circle cx="22" cy="32" r="3" fill="#22c55e"/>
      <circle cx="44" cy="32" r="10" stroke="#4ade80" stroke-width="2"/>
      <circle cx="44" cy="32" r="3" fill="#22c55e"/>
      <rect x="14" y="48" width="24" height="4" fill="#fbbf24"/>
      <rect x="4" y="12" width="3" height="40" fill="#94a3b8"/>
    </svg>`,
  'pc case': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M20 8h24a4 4 0 014 4v44H20z" fill="#1e293b" stroke="#94a3b8" stroke-width="2"/>
      <path d="M24 12h20v40H24z" fill="#0ea5e9" opacity="0.25" stroke="#38bdf8" stroke-width="1.5"/>
      <circle cx="44" cy="14" r="2" fill="#22c55e"/>
      <path d="M28 30h12M28 38h12M28 46h8" stroke="#64748b" stroke-width="2"/>
    </svg>`
};

const ICON = key => ICONS[key];

export const HARDWARE_VARIANTS = [
  // ------------------------------------------------------------ motherboards
  {
    id: 'mb_msi_b550_tomahawk',
    name: 'MSI MAG B550 Tomahawk',
    category: HARDWARE_CATEGORIES.MOTHERBOARD,
    categoryKey: 'motherboard',
    tag: 'Motherboard',
    modelPath: '/models/Motherboard_model/motherboard_am4.glb',
    brand: 'MSI',
    price: '3,290,000 đ',
    realSize: 0.305,
    footprint: { length: 0.305, depth: 0.252 },
    iconSvg: ICON('motherboard'),
    specs: [
      { label: 'Socket', value: 'AM4 (AMD Ryzen 1000-5000)' },
      { label: 'Chipset', value: 'AMD B550' },
      { label: 'Kích thước Form Factor', value: 'ATX (30.5 cm x 24.4 cm)' },
      { label: 'Khe RAM', value: '4x DDR4 DIMM (Tối đa 128GB, 4400MHz OC)' },
      { label: 'Khe PCIe', value: '2x PCIe 4.0 x16, 1x PCIe 3.0 x16' },
      { label: 'Cổng M.2 & SATA', value: '2x M.2 NVMe/SATA, 6x SATA III' },
      { label: 'Kết nối mạng', value: 'Realtek 2.5G LAN' }
    ],
    description: 'Bo mạch AM4 phổ thông cho dòng Ryzen, nền tảng dễ nâng cấp lên thế hệ Zen 3.',
    beginnerTip: '💡 Board AM4 chỉ nhận CPU kiểu AM4. Kiểm tra khe RAM DDR4 (không phải DDR5) trước khi mua CPU.'
  },

  // -------------------------------------------------------------------- CPUs
  {
    id: 'cpu_intel_i5_10400',
    name: 'Intel Core i5-10400',
    category: HARDWARE_CATEGORIES.CPU,
    categoryKey: 'cpu',
    tag: 'CPU',
    modelPath: '/models/CPU_model/intel_cpu (1).glb',
    brand: 'Intel',
    price: '2,790,000 đ',
    realSize: 0.0375,
    footprint: { length: 0.0375, depth: 0.0375 },
    iconSvg: ICON('cpu'),
    specs: [
      { label: 'Socket', value: 'LGA 1200' },
      { label: 'Kiến trúc', value: 'Comet Lake 6 nhân 12 luồng' },
      { label: 'Xung nhịp', value: '2.9 GHz tăng tốc 4.7 GHz' },
      { label: 'Bộ nhớ đệm', value: '12 MB Smart Cache' },
      { label: 'TDP', value: '65W' }
    ],
    description: 'CPU 6 nhân giá rẻ, đủ sức cho game eSports và văn phòng nặng.',
    beginnerTip: '💡 Nắp lưng phẳng là mặt tiếp keo tản nhiệt. Đừng chạm tay vào các chân nhỏ bên dưới.'
  },
  {
    id: 'cpu_intel_i7_11700',
    name: 'Intel Core i7-11700',
    category: HARDWARE_CATEGORIES.CPU,
    categoryKey: 'cpu',
    tag: 'CPU',
    modelPath: '/models/CPU_model/free_intel_cpu.glb',
    brand: 'Intel',
    price: '7,490,000 đ',
    realSize: 0.0375,
    footprint: { length: 0.0375, depth: 0.0375 },
    iconSvg: ICON('cpu'),
    specs: [
      { label: 'Socket', value: 'LGA 1200' },
      { label: 'Kiến trúc', value: 'Rocket Lake 8 nhân 16 luồng' },
      { label: 'Xung nhịp', value: '2.5 GHz tăng tốc 4.9 GHz' },
      { label: 'Bộ nhớ đệm', value: '16 MB Smart Cache' },
      { label: 'TDP', value: '65W' }
    ],
    description: '8 nhân cho dựng hình, render và chơi game 1440p cùng lúc.',
    beginnerTip: '💡 CPU không có chân cắm, nó dùng hàng chân phẳng. Cắm đúng chiều là nhìn dấu tam giác ở một góc.'
  },
  {
    id: 'cpu_ryzen_9_9920g',
    name: 'AMD Ryzen 9 9950X3D (AM5)',
    category: HARDWARE_CATEGORIES.CPU,
    categoryKey: 'cpu',
    tag: 'CPU',
    modelPath: '/models/CPU_model/free__cpu_3d_model_hyper_9_9920g.glb',
    brand: 'AMD',
    price: '18,900,000 đ',
    realSize: 0.04,
    footprint: { length: 0.04, depth: 0.04 },
    iconSvg: ICON('cpu'),
    specs: [
      { label: 'Socket', value: 'AM5 (LGA 1718)' },
      { label: 'Kiến trúc', value: 'Zen 5 16 nhân 32 luồng' },
      { label: 'Xung nhịp', value: 'Tăng tốc 5.7 GHz' },
      { label: 'Bộ nhớ đệm', value: '144 MB 3D V-Cache' },
      { label: 'TDP', value: '170W' }
    ],
    description: 'CPU cao cấp gắn cache 3D, mạnh nhất cho game nhờ ưu tiên cache L3.',
    beginnerTip: '💡 TDP cao nghĩa là tản khí phải to và cần cả tản khí CPU + ốc + sơn hợp lý. Sức nóng không tự truyền ra vỏ ốc.'
  },
  {
    id: 'cpu_ryzen_3_3200g',
    name: 'AMD Ryzen 3 3200G',
    category: HARDWARE_CATEGORIES.CPU,
    categoryKey: 'cpu',
    tag: 'CPU',
    modelPath: '/models/CPU_model/am4_cpu__free.glb',
    brand: 'AMD',
    price: '1,150,000 đ',
    realSize: 0.04,
    footprint: { length: 0.04, depth: 0.04 },
    iconSvg: ICON('cpu'),
    specs: [
      { label: 'Socket', value: 'AM4' },
      { label: 'Kiến trúc', value: 'Zen+ 2 nhân 4 luồng, tích hợp Vega 8' },
      { label: 'Xung nhịp', value: '3.6 GHz tăng tốc 4.0 GHz' },
      { label: 'Đồ họa tích hợp', value: 'Vega 8 (không cần card rời)' },
      { label: 'TDP', value: '65W' }
    ],
    description: 'CPU có VGA on-board, chạy được game nhẹ mà không cần cắm card đồ họa rời.',
    beginnerTip: '💡 Có đồ họa tích hợp nên máy vẫn hiện hình qua cổng của bo mạch chủ ngay cả khi chưa có card rời.'
  },

  // ------------------------------------------------------------- CPU coolers
  {
    id: 'cooler_noctua_nh_c12',
    name: 'Noctua NH-C12 Low Profile',
    category: HARDWARE_CATEGORIES.COOLER,
    categoryKey: 'cooler',
    tag: 'CPU Cooler',
    modelPath: '/models/CPU_Cooler_model/cpu_cooler.glb',
    brand: 'Noctua',
    price: '2,650,000 đ',
    realSize: 0.124,
    footprint: { length: 0.124, depth: 0.124 },
    iconSvg: ICON('cooler'),
    specs: [
      { label: 'Loại tản', value: 'Tháp tản nhiệt thấp (down-draft)' },
      { label: 'Chiều cao', value: '66 mm - vừa thùng mini' },
      { label: 'Quạt', value: '2x 92mm Noctua NF-A12x15' },
      { label: 'Tương thích', value: 'Intel LGA1700/1200, AMD AM4/AM5' }
    ],
    description: 'Tản thấp cho thùng mini, quạt hướng xuống giúp luồng khí qua bo mạch.',
    beginnerTip: '💡 Tản thấp lùi được cả tản case trên cao, đổi lại hiệu năng mát kém hơn tản tháp cao.'
  },
  {
    id: 'cooler_deepcool_ak400',
    name: 'DeepCool AK400',
    category: HARDWARE_CATEGORIES.COOLER,
    categoryKey: 'cooler',
    tag: 'CPU Cooler',
    modelPath: '/models/CPU_Cooler_model/cpu_cooler (1).glb',
    brand: 'DeepCool',
    price: '790,000 đ',
    realSize: 0.155,
    footprint: { length: 0.155, depth: 0.11 },
    iconSvg: ICON('cooler'),
    specs: [
      { label: 'Loại tản', value: 'Tản khí 1 ống đồng' },
      { label: 'Chiều cao', value: '155 mm' },
      { label: 'Quạt', value: '1x 120mm (tối đa 2200 RPM)' },
      { label: 'Tương thích', value: 'Intel LGA1700/1200, AMD AM4/AM5' }
    ],
    description: 'Tản khí phổ thông, đủ mát cho CPU TDP 180W với giá rẻ.',
    beginnerTip: '💡 4 ốc siết theo hình chữ X giúp áp lực đều, tránh làm lệch tản khỏi nắp lưng CPU.'
  },

  // -------------------------------------------------------------------- RAM
  // Every kit is listed twice, the way it is sold: one stick to look at, and a
  // second so step 5 (two DIMMs, dual channel) always has a pair on the bench.
  {
    id: 'ram_kingston_fury_black',
    name: 'Kingston FURY Beast DDR4 16GB',
    category: HARDWARE_CATEGORIES.RAM,
    categoryKey: 'ram',
    tag: 'RAM',
    modelPath: '/models/RAM_model/kingston_hyperx_fury_black_ram_module.glb',
    brand: 'Kingston',
    price: '890,000 đ',
    realSize: 0.1334,
    footprint: { length: 0.1334, depth: 0.045 },
    iconSvg: ICON('ram'),
    specs: [
      { label: 'Dung lượng', value: '16GB (1 thanh 2x8GB)' },
      { label: 'Loại', value: 'DDR4 DIMM không ECC' },
      { label: 'Bus', value: '3200 MHz (PC4-25600)' },
      { label: 'Điện áp', value: '1.35V' }
    ],
    description: 'DIMM DDR4 đen không đèn, tiêu tốn điện thấp và tương thích rộng.',
    beginnerTip: '💡 Khoảnh khắc mở giữa hai cắt khía trên module là vị trí chống lắp ngược - luôn cắm cho khớp lẹm.'
  },
  {
    id: 'ram_kingston_fury_black_b',
    name: 'Kingston FURY Beast DDR4 16GB - Kit B',
    category: HARDWARE_CATEGORIES.RAM,
    categoryKey: 'ram',
    tag: 'RAM',
    modelPath: '/models/RAM_model/kingston_hyperx_fury_black_ram_module.glb',
    brand: 'Kingston',
    price: '890,000 đ',
    realSize: 0.1334,
    footprint: { length: 0.1334, depth: 0.045 },
    iconSvg: ICON('ram'),
    specs: [
      { label: 'Dung lượng', value: '16GB (1 thanh 2x8GB)' },
      { label: 'Loại', value: 'DDR4 DIMM không ECC' },
      { label: 'Bus', value: '3200 MHz (PC4-25600)' }
    ],
    description: 'Thanh thứ hai của bộ Kingston FURY Beast, để ghép thành cặp kênh đôi.',
    beginnerTip: '💡 Cắm vào khe A2 và B2 để chạy dual channel.'
  },
  {
    id: 'ram_crucial_8gb',
    name: 'Crucial 8GB DDR4 2133',
    category: HARDWARE_CATEGORIES.RAM,
    categoryKey: 'ram',
    tag: 'RAM',
    modelPath: '/models/RAM_model/crucial_8_gb_ddr4_2133_ram.glb',
    brand: 'Crucial',
    price: '520,000 đ',
    realSize: 0.1334,
    footprint: { length: 0.1334, depth: 0.032 },
    iconSvg: ICON('ram'),
    specs: [
      { label: 'Dung lượng', value: '8GB (1 thanh 1x8GB)' },
      { label: 'Loại', value: 'DDR4 DIMM không ECC' },
      { label: 'Bus', value: '2133 MHz (JEDEC chuẩn)' }
    ],
    description: 'Thanh RAM DDR4 tiêu chuẩn, chạy bus mặc định an toàn cho mainboard phổ thông.',
    beginnerTip: '💡 Bus cao hơn bo mạch không chạy được - CPU và bo phải hỗ trợ bus đó thì mới tự ép xung lên.'
  },
  {
    id: 'ram_crucial_8gb_b',
    name: 'Crucial 8GB DDR4 2133 - Kit B',
    category: HARDWARE_CATEGORIES.RAM,
    categoryKey: 'ram',
    tag: 'RAM',
    modelPath: '/models/RAM_model/crucial_8_gb_ddr4_2133_ram.glb',
    brand: 'Crucial',
    price: '520,000 đ',
    realSize: 0.1334,
    footprint: { length: 0.1334, depth: 0.032 },
    iconSvg: ICON('ram'),
    specs: [
      { label: 'Dung lượng', value: '8GB (1 thanh 1x8GB)' },
      { label: 'Loại', value: 'DDR4 DIMM không ECC' },
      { label: 'Bus', value: '2133 MHz (JEDEC chuẩn)' }
    ],
    description: 'Thanh Crucial thứ hai, cùng bus để ghép cặp kênh đôi ở khe A2 và B2.',
    beginnerTip: '💡 Hai thanh cùng bus và cùng timing sẽ chạy ổn định nhất.'
  },
  {
    id: 'ram_generic_ddr4',
    name: 'Generic DDR4 8GB',
    category: HARDWARE_CATEGORIES.RAM,
    categoryKey: 'ram',
    tag: 'RAM',
    modelPath: '/models/RAM_model/random_access_memory_ram_ddr4.glb',
    brand: 'Generic',
    price: '430,000 đ',
    realSize: 0.1334,
    footprint: { length: 0.1334, depth: 0.032 },
    iconSvg: ICON('ram'),
    specs: [
      { label: 'Dung lượng', value: '8GB' },
      { label: 'Loại', value: 'DDR4' },
      { label: 'Bus', value: '2666 MHz' }
    ],
    description: 'Module DDR4 dùng để so sánh hình dáng đầu nối và vị trí khe cắm.',
    beginnerTip: '💡 Khe cắm của DDR4 rộng và có nẹp khóa hai bên. Cắm lệch một răng là mainboard không nhận.'
  },
  {
    id: 'ram_generic_ddr4_b',
    name: 'Generic DDR4 8GB - Kit B',
    category: HARDWARE_CATEGORIES.RAM,
    categoryKey: 'ram',
    tag: 'RAM',
    modelPath: '/models/RAM_model/random_access_memory_ram_ddr4.glb',
    brand: 'Generic',
    price: '430,000 đ',
    realSize: 0.1334,
    footprint: { length: 0.1334, depth: 0.032 },
    iconSvg: ICON('ram'),
    specs: [
      { label: 'Dung lượng', value: '8GB' },
      { label: 'Loại', value: 'DDR4' },
      { label: 'Bus', value: '2666 MHz' }
    ],
    description: 'Module DDR4 thứ hai cùng loại, để ghép cặp kênh đôi.',
    beginnerTip: '💡 Cắm cả hai thanh vào khe A2 và B2 để bật kênh đôi.'
  },

  // -------------------------------------------------------------------- SSD
  {
    id: 'ssd_sandisk_870',
    name: 'SanDisk SSD 870 EVO 1TB',
    category: HARDWARE_CATEGORIES.STORAGE,
    categoryKey: 'storage',
    tag: 'Storage',
    modelPath: '/models/SSD_model/ssd_solid_state_drive.glb',
    brand: 'SanDisk',
    price: '2,450,000 đ',
    realSize: 0.1,
    footprint: { length: 0.1, depth: 0.07 },
    iconSvg: ICON('ssd'),
    specs: [
      { label: 'Dung lượng', value: '1 TB' },
      { label: 'Giao diện', value: 'SATA III 6 Gb/s' },
      { label: 'Tốc độ đọc', value: '560 MB/s' },
      { label: 'Dạng', value: '2.5 inch, 7mm' }
    ],
    description: 'Ổ SATA 2.5" kinh điển, cắm cùng cổng với ổ cơ nên không cần cáp riêng.',
    beginnerTip: '💡 Ổ 2.5" không có chốt chống rung như ổ 3.5", nên chỉ cần cáp SATA dữ liệu và cáp nguồn nhỏ.'
  },
  {
    id: 'ssd_kingston_a400',
    name: 'Kingston A400 480GB',
    category: HARDWARE_CATEGORIES.STORAGE,
    categoryKey: 'storage',
    tag: 'Storage',
    modelPath: '/models/SSD_model/ssd_solid-state_drive.glb',
    brand: 'Kingston',
    price: '890,000 đ',
    realSize: 0.1,
    footprint: { length: 0.1, depth: 0.07 },
    iconSvg: ICON('ssd'),
    specs: [
      { label: 'Dung lượng', value: '480 GB' },
      { label: 'Giao diện', value: 'SATA III 6 Gb/s' },
      { label: 'Tốc độ đọc', value: '500 MB/s' },
      { label: 'Dạng', value: '2.5 inch' }
    ],
    description: 'Ổ SSD giá rẻ nhất trong bộ sưu tập, đủ dùng cho ổ hệ thống và tài liệu.',
    beginnerTip: '💡 Ổ rẻ thường chậm hơn khi ghi nhiều, nhưng vẫn nhanh hơn hàng trăm lần so với ổ cơ HDD.'
  },

  // -------------------------------------------------------------------- PSU
  {
    id: 'psu_corsair_rm550',
    name: 'Corsair RM550 550W 80 Plus Gold',
    category: HARDWARE_CATEGORIES.PSU,
    categoryKey: 'psu',
    tag: 'Power Supply',
    modelPath: '/models/PSU_model/psu.glb',
    brand: 'Corsair',
    price: '2,190,000 đ',
    realSize: 0.15,
    footprint: { length: 0.15, depth: 0.15 },
    iconSvg: ICON('psu'),
    specs: [
      { label: 'Công suất', value: '550 Watts' },
      { label: 'Chứng nhận', value: '80 PLUS Gold (> 90%)' },
      { label: 'Dạng cáp', value: 'Fully Modular' },
      { label: 'Quạt', value: '135mm Zero RPM' }
    ],
    description: 'Nguồn vàng full-modular, chỉ cắm đúng những cáp cần dùng nên thùng gọn sạch.',
    beginnerTip: '💡 Nguồn full-modular có đầu cắm riêng cho từng dây. Bỏ sót cáp 8-pin CPU là máy không lên nguồn.'
  },
  {
    id: 'psu_aerocool_kcas500',
    name: 'Aerocool KCAS 500W 80 Plus Bronze',
    category: HARDWARE_CATEGORIES.PSU,
    categoryKey: 'psu',
    tag: 'Power Supply',
    modelPath: '/models/PSU_model/power_supply_aerocool_kcas_500w_atx.glb',
    brand: 'Aerocool',
    price: '990,000 đ',
    realSize: 0.15,
    footprint: { length: 0.15, depth: 0.15 },
    iconSvg: ICON('psu'),
    specs: [
      { label: 'Công suất', value: '500 Watts' },
      { label: 'Chứng nhận', value: '80 PLUS Bronze' },
      { label: 'Dạng cáp', value: 'Non-Modular' },
      { label: 'Đầu cấp nguồn', value: '1x 24-Pin ATX, 1x 8-Pin CPU, 1x 8-Pin PCIe' }
    ],
    description: 'Nguồn ATX tiêu chuẩn, cáp gộp liền, dễ dùng cho dàn máy tầm trung.',
    beginnerTip: '💡 Tổng công suất nguồn nên gấp khoảng 1.5 lần tổng TDP của CPU và GPU để dự phòng đỉnh điện.'
  },

  // -------------------------------------------------------------------- GPU
  {
    id: 'gpu_gold_edition',
    name: 'Generic Gold Edition Graphics Card',
    category: HARDWARE_CATEGORIES.GPU,
    categoryKey: 'gpu',
    tag: 'GPU',
    modelPath: '/models/GPU_model/gold_graphics_card.glb',
    brand: 'Generic',
    price: '5,490,000 đ',
    realSize: 0.28,
    footprint: { length: 0.28, depth: 0.13 },
    iconSvg: ICON('gpu'),
    specs: [
      { label: 'Dung lượng VRAM', value: '8GB' },
      { label: 'Giao diện', value: 'PCIe 3.0 x16' },
      { label: 'Chiều dài', value: '280 mm' },
      { label: 'Cổng xuất hình', value: '1x HDMI, 2x DisplayPort' }
    ],
    description: 'Card đồ họa bản mạ vàng dùng để so sánh kích thước với card đồ họa cao cấp.',
    beginnerTip: '💡 Card dài hơn 28 cm thường không vừa khe PCIe của thùng mini. Đo trước khoảng trống từ khay ổ cứng.'
  },
];
