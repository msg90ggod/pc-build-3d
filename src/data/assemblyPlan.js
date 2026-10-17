/**
 * The 9 steps of building a PC, in the order a technician would actually do them.
 *
 * Wiring is deliberately NOT one of them: the machine leaves Build Mode with the
 * panel back on and the cables still out, and the player hooks it up to the
 * monitor on the bench (click the case's video port, then the monitor's HDMI
 * port). That is where a real builder does it, and it is the last thing the
 * room needs before it will boot.
 *
 * Each step declares:
 *   zone     - the Build Zone snap target in caseLayout.js
 *   accepts  - hardware ids, or `tag:` to accept any part with that hardware tag
 *   need     - how many parts this step consumes
 *   action   - what the player must do *after* the part is seated
 *              'glass'   detach / refit the tempered side panel
 *              'screw'   drive the fasteners (the count comes from the case zone,
 *                        because a notched tray really does have fewer standoffs)
 *              'paste'   apply thermal paste, then screw the cooler down
 *              'seat'    press the part home / close the retention latch
 */
export const ASSEMBLY_STEPS = [
  {
    step: 1,
    zone: 'glass',
    action: 'glass',
    shortName: 'Tháo nắp kính cường lực',
    title: 'Bước 1 · Tháo nắp kính cường lực',
    instruction:
      'Nới 4 núm vặn ở góc rồi kéo nắp kính ra khỏi thùng. Nhìn qua nắp kính bạn thấy toàn bộ ruột thùng — hãy tháo nó ra trước khi lắp linh kiện.',
    tip: 'Bấm nút THÁO NẮP KÍNH, hoặc bấm trực tiếp vào tấm kính bên trong khung Build Zone.',
    accepts: [],
    need: 0
  },
  {
    step: 2,
    zone: 'motherboard',
    action: 'screw',
    accepts: ['tag:Motherboard'],
    need: 1,
    shortName: 'Lắp bo mạch chủ vào chân ốc đồng',
    title: 'Bước 2 · Lắp bo mạch chủ',
    instruction:
      'Đặt bo mạch chủ ATX lên các chân ốc đồng phía trong khay bo mạch, vuông vồn theo các lỗ khoan, rồi siết chặt từng con ốc để cố định.',
    tip: 'Lấy bo mạch ra khỏi kho, rê chuột vào Build Zone cho model theo con trỏ, rồi bấm chuột trái khi vị trí đã khớp vùng màu xanh. Số ốc sẽ hiện đúng bằng số chân ốc thực sự có trên khay.',
    shortHint: 'Chọn bo mạch chủ → đặt vào khay → siết hết ốc'
  },
  {
    step: 3,
    zone: 'cpu',
    action: 'seat',
    accepts: ['tag:CPU'],
    need: 1,
    shortName: 'Lắp CPU vào socket',
    title: 'Bước 3 · Lắp bộ vi xử lý',
    instruction:
      'Nhận CPU theo góc tam giác vàng, hạ nhẹ xuống socket rồi đóng khóa lưỡi cài. Tuyệt đối không dùng lực ép mạnh xuống socket.',
    tip: 'Bấm chuột trái một lần nữa khi model đã nằm đúng vị trí để ấn CPU xuống socket và khóa lại.',
    shortHint: 'Ghép đúng góc tam giác vàng rồi ấn xuống'
  },
  {
    step: 4,
    zone: 'cooler',
    action: 'paste',
    accepts: ['tag:CPU Cooler'],
    need: 1,
    shortName: 'Bôi keo và lắp tản nhiệt',
    title: 'Bước 4 · Bôi keo tản nhiệt & lắp tản khí',
    instruction:
      'Bôi một lượng keo tản nhiệt cỡ hạt đậu lên nắp lưng CPU, đặt tản nhiệt lên socket rồi siết 4 ốc theo hình chữ X để ép đều.',
    tip: 'Quạt tản nhiệt phải hướng về phía quạt trước case để hút khí mát từ ngoài vào.',
    shortHint: 'Bôi keo → đặt tản → siết 4 ốc hình chữ X'
  },
  {
    step: 5,
    zone: 'ram',
    action: 'seat',
    accepts: ['tag:RAM'],
    need: 2,
    shortName: 'Cắm thanh RAM vào khe Dual-Channel',
    title: 'Bước 5 · Cắm thanh RAM',
    instruction:
      'Cắm 2 thanh RAM vào khe số 2 và khe số 4 (DIMM A2 & B2) để kích hoạt kênh đôi, rồi ấn hai đầu khe xuống cho tới khi cả hai bên khớp vào.',
    tip: 'Khe DIMM nằm sát mép bo mạch về phía tấm che nguồn. Phải 2 thanh cho kênh đôi.',
    shortHint: '2 thanh vào khe A2 & B2'
  },
  {
    step: 6,
    zone: 'ssd',
    action: 'screw',
    accepts: ['tag:Storage'],
    need: 1,
    shortName: 'Lắp ổ cứng SSD 2.5"',
    title: 'Bước 6 · Lắp ổ cứng thể rắn',
    instruction:
      'Đặt SSD 2.5" vào khay đĩa cứng trên tấm che nguồn, cắm cáp SATA vào đầu nối rồi siết 2 ốc phía đuôi ổ.',
    tip: 'SSD không có đầu đọc đầu, nên có thể cắm theo cả hai chiều mà không sợ hỏng.',
    shortHint: 'Đặt vào khay → cắm SATA → siết 2 ốc'
  },
  {
    step: 7,
    zone: 'psu',
    action: 'screw',
    accepts: ['tag:Power Supply'],
    need: 1,
    shortName: 'Lắp bộ nguồn vào hộc đáy',
    title: 'Bước 7 · Lắp bộ nguồn',
    instruction:
      'Lắp nguồn ATX vào hộc dưới đáy với quạt hướng xuống lưới lọc bụi, cắm dây nguồn AC vào mặt sau rồi siết 4 ốc vào thùng.',
    tip: 'Nguồn nên lắp ở chế độ semi-modular: chỉ cắm những dây thật sự cần để gọn gàng trong thùng.',
    shortHint: 'Quạt hướng xuống → siết 4 ốc'
  },
  {
    step: 8,
    zone: 'gpu',
    action: 'screw',
    accepts: ['tag:GPU'],
    need: 1,
    shortName: 'Lắp card đồ họa vào khe PCIe x16',
    title: 'Bước 8 · Lắp card đồ họa',
    instruction:
      'Rút chân chốt khe PCIe x16, cắm card đồ họa vào khe gần CPU nhất, ấn card xuống hết đáy rồi siết 2 ốc vào thanh chốt phía sau thùng.',
    tip: 'Card đồ họa rất nặng, giữ cả hai tay khi ấn và luôn kiểm tra mọi đầu cắm đã chặt trước khi đóng thùng.',
    shortHint: 'Cắm khe PCIe x16 → siết chốt giữ card'
  },
  {
    step: 9,
    zone: 'glass',
    action: 'glass',
    accepts: [],
    need: 0,
    shortName: 'Đóng nắp kính bảo vệ',
    title: 'Bước 9 · Đóng nắp kính',
    instruction:
      'Đặt nắp kính cường lực lại đúng vị trí rồi siết 4 núm vặn ở góc để chốt chặt.',
    tip: 'Kiểm tra không còn khe hở giữa kính và khung thùng trước khi bật nguồn.',
    shortHint: 'Đặt lại kính → siết 4 núm'
  }
];

export const TOTAL_STEPS = ASSEMBLY_STEPS.length;

/** True when `item` is hardware this step will take. */
export function stepAccepts(step, item) {
  if (!step || !item) return false;
  return step.accepts.some(rule => {
    if (rule.startsWith('tag:')) {
      const tag = rule.slice(4).toLowerCase();
      return (item.tag || '').toLowerCase() === tag;
    }
    return rule === item.id;
  });
}

export function getStep(stepNumber) {
  return ASSEMBLY_STEPS.find(s => s.step === stepNumber) || null;
}

/**
 * The concrete parts a step calls for, as display names.
 *
 * A beginner following "Bôi keo tản nhiệt & lắp tản khí" has no way to know
 * that means "the CPU Cooler" and that they have to go and find it on the bench.
 * Steps that consume a tag are given one example part name each, resolved from
 * the live catalogue so the label can never drift from the model list.
 *
 * @param {object} step
 * @param {Array} catalogue  the hardware items
 * @returns {Array<{name: string, tag: string, count: number, icon: string}>}
 */
export function stepPartNames(step, catalogue) {
  if (!step || !catalogue) return [];
  const out = [];

  for (const rule of step.accepts || []) {
    const matches = catalogue.filter(item =>
      rule.startsWith('tag:')
        ? (item.tag || '').toLowerCase() === rule.slice(4).toLowerCase()
        : rule === item.id
    );
    if (!matches.length) continue;

    const tag = matches[0].tag;
    const count = step.need || 1;
    out.push({
      name: matches[0].name,
      tag,
      count,
      // a count of two reads better than repeating the same name twice
      label: count > 1 ? `${matches[0].name} × ${count}` : matches[0].name,
      variants: matches.length
    });
  }

  return out;
}

/**
 * How each hardware tag reads in plain Vietnamese, with no model attached.
 *
 * The lists on the bench and in the parts panel deliberately never name a SKU.
 * The catalogue carries several variants of almost every kind - six DIMMs, three
 * coolers, two PSUs - and the player is told what *kind* of part to go and fetch,
 * because that is what decides where to look. Printing one model name would be
 * wrong the moment they pick up a different box off the rack.
 */
const PART_KIND_NAMES = {
  motherboard: 'Bo mạch chủ',
  cpu: 'Bộ vi xử lý',
  'cpu cooler': 'Tản nhiệt CPU',
  ram: 'Thanh RAM',
  storage: 'Ổ cứng SSD',
  'power supply': 'Bộ nguồn',
  gpu: 'Card đồ họa'
};

/** The generic name for a hardware tag, falling back to the tag itself. */
export function partKindName(tag) {
  return PART_KIND_NAMES[(tag || '').toLowerCase()] || tag || 'Linh kiện';
}

/**
 * Same list as `stepPartNames`, but naming the kind of part rather than the model.
 * Everything else - count, tag, how many variants exist - is unchanged.
 */
export function stepPartLabels(step, catalogue) {
  return stepPartNames(step, catalogue).map(part => {
    const name = partKindName(part.tag);
    return {
      ...part,
      name,
      label: part.count > 1 ? `${name} × ${part.count}` : name
    };
  });
}
