// ============================================================
//  SETUP_KM_DATABASE.gs
//  Chạy hàm setupKMDatabase() một lần trên Google Sheet trắng.
//  Tạo 17 sheet đúng theo schema CTKM v3, format header,
//  seed dữ liệu cơ bản (branches, promotions, voucher_tiers...).
// ============================================================

// ── MÀU SẮC THEO NHÓM ──────────────────────────────────────
const COLOR = {
  MASTER:    '#1565C0',  // Xanh đậm — Danh mục
  PEOPLE:    '#2E7D32',  // Xanh lá — Con người
  PROMO:     '#6A1B9A',  // Tím — Khuyến mãi
  TRANS:     '#BF360C',  // Cam đỏ — Giao dịch
  HEADER_BG: '#ECEFF1',  // Nền header chung
  REQUIRED:  '#FFF9C4',  // Vàng nhạt — cột bắt buộc
};

// ── ĐỊNH NGHĨA 17 BẢNG ─────────────────────────────────────
// Mỗi bảng: { name, group, color, cols: [{key, label, required, note}] }
const TABLES = [

  // ── NHÓM 1: DANH MỤC ───────────────────────────────────
  {
    name: 'branches', group: 'Danh mục', color: COLOR.MASTER,
    note: 'Chi nhánh / cơ sở phòng khám',
    cols: [
      { key: 'id',          label: 'id',          req: true  },
      { key: 'branch_code', label: 'branch_code', req: true,  note: 'VD: BR_1' },
      { key: 'branch_name', label: 'branch_name', req: true  },
      { key: 'address',     label: 'address' },
      { key: 'is_active',   label: 'is_active',   req: true,  note: '1=Hoạt động 0=Tắt' },
      { key: 'created_at',  label: 'created_at' },
      { key: 'updated_at',  label: 'updated_at' },
    ]
  },

  {
    name: 'service_categories', group: 'Danh mục', color: COLOR.MASTER,
    note: 'Cây phân loại dịch vụ (có parent_id để tạo cây con)',
    cols: [
      { key: 'id',             label: 'id',             req: true },
      { key: 'parent_id',      label: 'parent_id',      note: 'NULL = danh mục gốc' },
      { key: 'category_code',  label: 'category_code'  },
      { key: 'category_name',  label: 'category_name',  req: true },
      { key: 'category_level', label: 'category_level', note: '1=gốc 2=con...' },
      { key: 'display_order',  label: 'display_order'  },
      { key: 'created_at',     label: 'created_at'     },
    ]
  },

  {
    name: 'services', group: 'Danh mục', color: COLOR.MASTER,
    note: 'Danh mục dịch vụ master (2269 dòng từ xlsx)',
    cols: [
      { key: 'id',                 label: 'id',                 req: true },
      { key: 'category_id',        label: 'category_id',        req: true, note: '→ service_categories.id' },
      { key: 'service_group_code', label: 'service_group_code' },
      { key: 'item_code',          label: 'item_code' },
      { key: 'item_name',          label: 'item_name',          req: true },
      { key: 'unit',               label: 'unit',               note: 'Lần / Buổi / Vùng...' },
      { key: 'tags',               label: 'tags',               note: 'JSON array nhóm tag' },
      { key: 'is_active',          label: 'is_active',          req: true, note: '1=Hiển thị' },
      { key: 'created_at',         label: 'created_at' },
      { key: 'updated_at',         label: 'updated_at' },
    ]
  },

  {
    name: 'service_prices', group: 'Danh mục', color: COLOR.MASTER,
    note: 'Giá dịch vụ (NULL branch_id = áp dụng mọi chi nhánh)',
    cols: [
      { key: 'id',             label: 'id',             req: true },
      { key: 'service_id',     label: 'service_id',     req: true, note: '→ services.id' },
      { key: 'branch_id',      label: 'branch_id',      note: 'NULL = mọi CN' },
      { key: 'price_type',     label: 'price_type',     req: true, note: 'STANDARD / WEEKEND' },
      { key: 'base_price',     label: 'base_price',     req: true, note: 'VND nguyên' },
      { key: 'effective_date', label: 'effective_date', note: 'YYYY-MM-DD' },
      { key: 'end_date',       label: 'end_date',       note: 'NULL = không hết hạn' },
      { key: 'is_current',     label: 'is_current',     req: true, note: '1=Đang dùng' },
    ]
  },

  // ── NHÓM 2: CON NGƯỜI ──────────────────────────────────
  {
    name: 'customers', group: 'Con người', color: COLOR.PEOPLE,
    note: 'Khách hàng',
    cols: [
      { key: 'id',            label: 'id',            req: true },
      { key: 'full_name',     label: 'full_name' },
      { key: 'phone_number',  label: 'phone_number' },
      { key: 'date_of_birth', label: 'date_of_birth', note: 'YYYY-MM-DD' },
      { key: 'gender',        label: 'gender',        note: 'MALE/FEMALE/OTHER' },
      { key: 'occupation',    label: 'occupation',    note: 'STUDENT_TEACHER=HSSV/GV' },
      { key: 'customer_type', label: 'customer_type' },
      { key: 'created_at',    label: 'created_at' },
    ]
  },

  {
    name: 'employees', group: 'Con người', color: COLOR.PEOPLE,
    note: 'Nhân viên (CONSULTANT / CASHIER / MANAGER / ADMIN / DOCTOR)',
    cols: [
      { key: 'id',            label: 'id',            req: true },
      { key: 'employee_code', label: 'employee_code', req: true },
      { key: 'full_name',     label: 'full_name',     req: true },
      { key: 'email',         label: 'email' },
      { key: 'phone_number',  label: 'phone_number' },
      { key: 'role',          label: 'role',          req: true, note: 'ADMIN/CONSULTANT/CASHIER/MANAGER/DOCTOR' },
      { key: 'branch_id',     label: 'branch_id',     note: '→ branches.id' },
      { key: 'username',      label: 'username' },
      { key: 'password_hash', label: 'password_hash' },
      { key: 'status',        label: 'status',        req: true, note: 'ACTIVE/INACTIVE' },
      { key: 'created_at',    label: 'created_at' },
    ]
  },

  // ── NHÓM 3: KHUYẾN MÃI ─────────────────────────────────
  {
    name: 'promotions', group: 'Khuyến mãi', color: COLOR.PROMO,
    note: 'Header chiến dịch KM. max_discount_percent_cap=50 → trần tổng KM ≤50% giá gốc',
    cols: [
      { key: 'id',                       label: 'id',                       req: true },
      { key: 'promotion_name',           label: 'promotion_name',           req: true },
      { key: 'promotion_type',           label: 'promotion_type',           req: true, note: 'REGULAR / FLASH_SALE' },
      { key: 'start_date',               label: 'start_date',               req: true, note: 'YYYY-MM-DD' },
      { key: 'end_date',                 label: 'end_date',                 req: true, note: 'YYYY-MM-DD' },
      { key: 'applicable_days',          label: 'applicable_days',          note: 'NULL=mọi ngày / WEEKDAY / WEEKEND' },
      { key: 'max_discount_percent_cap', label: 'max_discount_percent_cap', note: '50 = tổng KM ≤50% giá gốc' },
      { key: 'is_stackable',             label: 'is_stackable',             req: true, note: '1=cho cộng dồn nhiều KM' },
      { key: 'description',              label: 'description' },
      { key: 'is_active',                label: 'is_active',                req: true, note: '1=Đang chạy' },
      { key: 'created_at',               label: 'created_at' },
      { key: 'updated_at',               label: 'updated_at' },
    ]
  },

  {
    name: 'promotion_categories', group: 'Khuyến mãi', color: COLOR.PROMO,
    note: 'KM áp dụng cho nhóm DV nào (M:N)',
    cols: [
      { key: 'promotion_id', label: 'promotion_id', req: true, note: '→ promotions.id' },
      { key: 'category_id',  label: 'category_id',  req: true, note: '→ service_categories.id' },
    ]
  },

  {
    name: 'promotion_branches', group: 'Khuyến mãi', color: COLOR.PROMO,
    note: 'QUY ƯỚC: rỗng = áp dụng mọi chi nhánh. Có dòng = chỉ CN được liệt kê.',
    cols: [
      { key: 'promotion_id', label: 'promotion_id', req: true, note: '→ promotions.id' },
      { key: 'branch_id',    label: 'branch_id',    req: true, note: '→ branches.id' },
    ]
  },

  {
    name: 'promo_rules', group: 'Khuyến mãi', color: COLOR.PROMO,
    note: 'Quy tắc con trong KM. valid_from/to = mốc ngày riêng ("từ 18/5..."). slots_used = đếm suất đã dùng',
    cols: [
      { key: 'id',                       label: 'id',                       req: true },
      { key: 'promotion_id',             label: 'promotion_id',             req: true, note: '→ promotions.id' },
      { key: 'rule_name',                label: 'rule_name',                req: true },
      { key: 'valid_from',               label: 'valid_from',               note: '[G2] mốc ngày con YYYY-MM-DD' },
      { key: 'valid_to',                 label: 'valid_to',                 note: '[G2] mốc ngày con YYYY-MM-DD' },
      { key: 'rule_priority',            label: 'rule_priority',            note: '0=thấp nhất' },
      { key: 'is_exclusive_rule',        label: 'is_exclusive_rule',        note: '1=không cộng với rule khác' },
      { key: 'is_stackable_with_others', label: 'is_stackable_with_others', note: '1=cho phép xếp chồng' },
      { key: 'max_applications',         label: 'max_applications',         note: 'NULL=vô hạn / 10=10 suất' },
      { key: 'slots_used',               label: 'slots_used',               req: true, note: '[G3] đếm suất đã dùng, default=0' },
      { key: 'created_at',               label: 'created_at' },
    ]
  },

  {
    name: 'rule_conditions', group: 'Khuyến mãi', color: COLOR.PROMO,
    note: [
      'Điều kiện áp dụng rule. Logic: AND trong cùng condition_group, OR giữa các group khác nhau.',
      'criteria_type: SERVICE_SELECTED | GROUP_SIZE | CUSTOMER_ATTRIBUTE | SERVICE_QTY | DAY_OF_WEEK | DOCTOR_TIER',
      'DOCTOR_TIER value_text: OWN_DOCTOR = BS của mình / OTHER_DOCTOR = BS khác',
    ].join('\n'),
    cols: [
      { key: 'id',                 label: 'id',                 req: true },
      { key: 'rule_id',            label: 'rule_id',            req: true, note: '→ promo_rules.id' },
      { key: 'condition_group',    label: 'condition_group',    req: true, note: 'AND nội nhóm / OR liên nhóm' },
      { key: 'criteria_type',      label: 'criteria_type',      req: true,
        note: 'SERVICE_SELECTED\nGROUP_SIZE\nCUSTOMER_ATTRIBUTE\nSERVICE_QTY\nDAY_OF_WEEK\nDOCTOR_TIER' },
      { key: 'operator',           label: 'operator',           note: '0:= 1:>= 2:<= 3:> 4:< 5:between' },
      { key: 'value_num',          label: 'value_num',          note: 'Số (nhóm ≥N người, số vùng...)' },
      { key: 'value_num_max',      label: 'value_num_max',      note: 'Giới hạn trên (between)' },
      { key: 'value_text',         label: 'value_text',
        note: 'STUDENT_TEACHER\nPARENT_OF_EXCELLENT_STUDENT\nMOTHER_AND_CHILD\nWEEKEND\nWEEKDAY\nOWN_DOCTOR\nOTHER_DOCTOR' },
      { key: 'target_service_id',  label: 'target_service_id',  note: '→ services.id' },
      { key: 'target_category_id', label: 'target_category_id', note: '→ service_categories.id' },
    ]
  },

  {
    name: 'rule_rewards', group: 'Khuyến mãi', color: COLOR.PROMO,
    note: [
      'Ưu đãi của rule.',
      'reward_type: FIXED_PRICE = giá cố định | DISCOUNT_FIXED = giảm X đồng | DISCOUNT_PERCENT = giảm X% | FREE_PRODUCT = tặng quà',
      'reward_value: VND (FIXED_PRICE/DISCOUNT_FIXED) hoặc 0-100 (DISCOUNT_PERCENT) hoặc NULL (FREE_PRODUCT)',
    ].join('\n'),
    cols: [
      { key: 'id',                        label: 'id',                        req: true },
      { key: 'rule_id',                   label: 'rule_id',                   req: true, note: '→ promo_rules.id' },
      { key: 'reward_type',               label: 'reward_type',               req: true,
        note: 'FIXED_PRICE\nDISCOUNT_FIXED\nDISCOUNT_PERCENT\nFREE_PRODUCT' },
      { key: 'reward_value',              label: 'reward_value',
        note: 'VND số nguyên (ko dùng 1e+06). NULL với FREE_PRODUCT' },
      { key: 'target_service_id',         label: 'target_service_id',         note: 'Ưu đãi áp riêng DV nào (tùy chọn)' },
      { key: 'gift_description',          label: 'gift_description',          note: 'VD: Tặng truyền giảm đau' },
      { key: 'voucher_duration_days',     label: 'voucher_duration_days',     note: 'Hạn dùng voucher (ngày)' },
      { key: 'installment_months',        label: 'installment_months',        note: 'Trả góp N tháng' },
      { key: 'installment_rate',          label: 'installment_rate',          note: 'Lãi suất trả góp (0.0 - 1.0)' },
      { key: 'recurring_interval_months', label: 'recurring_interval_months', note: 'Chu kỳ tái áp dụng (tháng)' },
    ]
  },

  {
    name: 'combos', group: 'Khuyến mãi', color: COLOR.PROMO,
    note: 'Gói combo. exclude_voucher=1 → combo siêu hời, không cộng voucher bill. slots_used đếm suất đã bán.',
    cols: [
      { key: 'id',                   label: 'id',                   req: true },
      { key: 'promotion_id',         label: 'promotion_id',         note: '→ promotions.id (NULL=combo độc lập)' },
      { key: 'combo_name',           label: 'combo_name',           req: true },
      { key: 'original_total_price', label: 'original_total_price', note: 'Σ giá lẻ thành phần (tính lại từ combo_items)' },
      { key: 'combo_price',          label: 'combo_price',          req: true, note: 'Giá bán combo VND' },
      { key: 'allow_extra_rules',    label: 'allow_extra_rules',    note: '1=cho phép cộng thêm rule khác' },
      { key: 'exclude_voucher',      label: 'exclude_voucher',      req: true, note: '[G4] 1=combo siêu hời (ko cộng voucher)' },
      { key: 'max_slots',            label: 'max_slots',            note: 'NULL=vô hạn' },
      { key: 'slots_used',           label: 'slots_used',           req: true, note: '[G3] default=0' },
      { key: 'is_active',            label: 'is_active',            req: true, note: '1=Đang bán' },
      { key: 'created_at',           label: 'created_at' },
    ]
  },

  {
    name: 'combo_items', group: 'Khuyến mãi', color: COLOR.PROMO,
    note: 'Dịch vụ thành phần trong combo',
    cols: [
      { key: 'id',               label: 'id',               req: true },
      { key: 'combo_id',         label: 'combo_id',         req: true, note: '→ combos.id' },
      { key: 'service_id',       label: 'service_id',       req: true, note: '→ services.id' },
      { key: 'quantity',         label: 'quantity',         req: true, note: 'default=1' },
      { key: 'allocated_price',  label: 'allocated_price',  note: 'Giá phân bổ cho DV này trong combo' },
      { key: 'item_description', label: 'item_description', note: 'Ghi chú thêm cho dòng này' },
    ]
  },

  {
    name: 'voucher_tiers', group: 'Khuyến mãi', color: COLOR.PROMO,
    note: 'Mốc bill → tặng voucher. VD: bill ≥30tr tặng voucher 1tr (30 ngày)',
    cols: [
      { key: 'id',                    label: 'id',                    req: true },
      { key: 'promotion_id',          label: 'promotion_id',          req: true, note: '→ promotions.id' },
      { key: 'min_bill_amount',       label: 'min_bill_amount',       req: true, note: 'Mốc bill tối thiểu VND' },
      { key: 'voucher_value',         label: 'voucher_value',         req: true, note: 'Giá trị voucher VND' },
      { key: 'voucher_duration_days', label: 'voucher_duration_days', note: 'Số ngày hiệu lực voucher' },
    ]
  },

  // ── NHÓM 4: GIAO DỊCH ──────────────────────────────────
  {
    name: 'invoices', group: 'Giao dịch', color: COLOR.TRANS,
    note: 'Hóa đơn / báo giá',
    cols: [
      { key: 'id',                   label: 'id',                   req: true },
      { key: 'customer_id',          label: 'customer_id',          note: '→ customers.id' },
      { key: 'branch_id',            label: 'branch_id',            note: '→ branches.id' },
      { key: 'consultant_id',        label: 'consultant_id',        note: '→ employees.id (tư vấn viên)' },
      { key: 'total_original_price', label: 'total_original_price', note: 'Tổng giá gốc trước KM' },
      { key: 'total_discount',       label: 'total_discount',       note: 'Tổng giảm' },
      { key: 'final_price',          label: 'final_price',          note: 'Thực thu' },
      { key: 'status',               label: 'status',               note: 'DRAFT/PENDING/APPROVED/PAID/CANCELLED' },
      { key: 'created_at',           label: 'created_at' },
    ]
  },

  {
    name: 'invoice_items', group: 'Giao dịch', color: COLOR.TRANS,
    note: 'Dòng dịch vụ trong hóa đơn. applied_rule_id để truy vết rule nào đã dùng (đếm slots_used)',
    cols: [
      { key: 'id',              label: 'id',              req: true },
      { key: 'invoice_id',      label: 'invoice_id',      req: true, note: '→ invoices.id' },
      { key: 'service_id',      label: 'service_id',      note: '→ services.id' },
      { key: 'doctor_id',       label: 'doctor_id',       note: '[G1] → employees.id (bác sĩ thực hiện)' },
      { key: 'quantity',        label: 'quantity',         req: true, note: 'default=1' },
      { key: 'base_price',      label: 'base_price',       note: 'Giá gốc DV tại thời điểm bán' },
      { key: 'discount_amount', label: 'discount_amount',  note: 'Số tiền giảm' },
      { key: 'final_price',     label: 'final_price',      note: 'Giá thực thu dòng này' },
      { key: 'applied_rule_id', label: 'applied_rule_id',  note: '[G3] → promo_rules.id; dùng để cộng slots_used' },
      { key: 'created_at',      label: 'created_at' },
    ]
  },
];

// ── DỮ LIỆU MẪU (seed) — là function để tránh lỗi top-level ──
function getSeed() {
  var ts = now();
  return {
    branches: [
      [1, 'BR_1', 'Hệ thống (tất cả CN)',       '',                                                    1, ts, ts],
      [2, 'BR_2', 'Hoàng Quốc Việt',            'Số 1/487 Hoàng Quốc Việt, Hà Nội',                   1, ts, ts],
      [3, 'BR_3', 'PKĐK Hà Đông - Văn Quán',   'Số 38-40 BT8, KĐT Văn Quán, Hà Đông',               1, ts, ts],
      [4, 'BR_4', 'Ocean Park (OCP)',            'Số 120-122 San Hô 06, KĐT Vinhomes Ocean Park',      1, ts, ts],
    ],

    promotions: [
      [1, 'CTKM 10 ngày vàng mừng sinh nhật OCP 4 tuổi', 'REGULAR',
       '2026-05-11', '2026-05-31', '', 50, 1,
       'Đợt 1: 11-21/5, Đợt 2: 22-31/5. Voucher theo mốc bill. Đi nhóm/HSSV giảm thêm.',
       1, ts, ts],
      [2, 'FLASHSALE 27-31/5/2026', 'FLASH_SALE',
       '2026-05-27', '2026-05-31', '', 50, 1, '', 1, ts, ts],
    ],

    voucher_tiers: [
      [1, 1,  30000000,   1000000, 30],
      [2, 1,  60000000,   3000000, 30],  // đã sửa 30tr → 3tr per KM gốc
      [3, 1, 100000000,   5000000, 90],
      [4, 1, 150000000,  10000000, 180],
    ],

    promo_rules: [
      // id, promo_id, rule_name, valid_from, valid_to, priority, exclusive, stackable, max_app, slots_used, created_at
      [1, 1, 'Đi nhóm 2 người giảm 500k/người',         '', '',           0, 0, 1, '', 0, ts],
      [2, 1, 'Đi nhóm từ 3 người giảm 1tr/người',        '', '',           0, 0, 1, '', 0, ts],
      [3, 1, 'HSSV / Giáo viên / Du học sinh giảm 500k', '', '',           0, 0, 1, '', 0, ts],
      [4, 1, 'Giảm 2tr — làm với BS khác (từ 18/5)',     '2026-05-18', '2026-05-31', 0, 0, 1, '', 0, ts],
    ],

    rule_conditions: [
      // id, rule_id, cond_group, criteria_type, operator, value_num, value_num_max, value_text, target_svc, target_cat
      [1, 1, 1, 'GROUP_SIZE',         0, 2, '', '',                            '', ''],
      [2, 2, 1, 'GROUP_SIZE',         0, 3, '', '',                            '', ''],
      [3, 3, 1, 'CUSTOMER_ATTRIBUTE', 0, '', '', 'STUDENT_TEACHER',            '', ''],
      [4, 4, 1, 'DOCTOR_TIER',        0, '', '', 'OTHER_DOCTOR',               '', ''],
    ],

    rule_rewards: [
      // id, rule_id, reward_type, reward_value, target_svc, gift_desc, voucher_days, inst_months, inst_rate, recur
      [1, 1, 'DISCOUNT_FIXED',   500000,  '', '', '', '', 0, ''],
      [2, 2, 'DISCOUNT_FIXED',  1000000,  '', '', '', '', 0, ''],
      [3, 3, 'DISCOUNT_FIXED',   500000,  '', '', '', '', 0, ''],
      [4, 4, 'DISCOUNT_FIXED',  2000000,  '', '', '', '', 0, ''],
    ],
  };
}

// ── TIỆN ÍCH ───────────────────────────────────────────────
function now() {
  return Utilities.formatDate(new Date(), 'Asia/Ho_Chi_Minh', 'yyyy-MM-dd HH:mm:ss');
}

// ============================================================
//  HÀM CHÍNH — chạy từ Apps Script editor
// ============================================================
function setupKMDatabase() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();

  const confirm = ui.alert(
    'Setup KM Database',
    'Sẽ tạo 17 sheet cho database CTKM.\n' +
    '⚠️ Các sheet cùng tên đã có sẽ bị XÓA và tạo lại.\n\n' +
    'Tiếp tục?',
    ui.ButtonSet.YES_NO
  );
  if (confirm !== ui.Button.YES) return;

  // Tạo sheet INDEX trước
  _createIndexSheet(ss);

  // Tạo từng bảng
  var seed = getSeed();
  TABLES.forEach(function(tbl) {
    _createTableSheet(ss, tbl);
    _seedData(ss, tbl, seed);
  });

  // Ẩn sheet Sheet1 mặc định nếu còn
  const defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Trang tính1');
  if (defaultSheet) defaultSheet.hideSheet();

  // Chuyển về INDEX
  ss.setActiveSheet(ss.getSheetByName('__INDEX__'));

  ui.alert('✅ Hoàn thành!',
    '17 sheet đã được tạo.\n' +
    'Dữ liệu mẫu đã được seed cho: branches, promotions, voucher_tiers, promo_rules, rule_conditions, rule_rewards.\n\n' +
    'Xem sheet __INDEX__ để tra cứu cấu trúc.',
    ui.ButtonSet.OK);
}

// ============================================================
//  TẠO SHEET INDEX
// ============================================================
function _createIndexSheet(ss) {
  let sheet = ss.getSheetByName('__INDEX__');
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet('__INDEX__', 0);

  // Tiêu đề
  sheet.getRange('A1:D1').merge()
    .setValue('📋 DATABASE CTKM — INDEX')
    .setBackground('#263238').setFontColor('#ECEFF1')
    .setFontSize(14).setFontWeight('bold')
    .setHorizontalAlignment('center');

  sheet.getRange('A2:D2').merge()
    .setValue('Schema v3 — 17 bảng phủ toàn bộ logic Khuyến Mãi')
    .setBackground('#37474F').setFontColor('#CFD8DC')
    .setFontSize(10).setHorizontalAlignment('center');

  // Header bảng index
  const hdr = sheet.getRange('A4:D4');
  hdr.setValues([['Sheet (tên bảng)', 'Nhóm', 'Số cột', 'Mô tả']]);
  hdr.setBackground('#455A64').setFontColor('#FFFFFF').setFontWeight('bold');

  const groups = { 'Danh mục': COLOR.MASTER, 'Con người': COLOR.PEOPLE, 'Khuyến mãi': COLOR.PROMO, 'Giao dịch': COLOR.TRANS };
  let row = 5;
  TABLES.forEach(function(tbl) {
    const note = Array.isArray(tbl.note) ? tbl.note[0] : (tbl.note || '');
    sheet.getRange(row, 1, 1, 4).setValues([[tbl.name, tbl.group, tbl.cols.length, note]]);
    sheet.getRange(row, 2).setBackground(groups[tbl.group] || '#607D8B')
      .setFontColor('#FFFFFF').setFontWeight('bold');
    row++;
  });

  // Ghi chú enum
  sheet.getRange(row + 1, 1, 1, 4).merge()
    .setValue('📌 ENUM QUAN TRỌNG')
    .setBackground('#263238').setFontColor('#ECEFF1').setFontWeight('bold');
  const enums = [
    ['criteria_type', 'SERVICE_SELECTED | GROUP_SIZE | CUSTOMER_ATTRIBUTE | SERVICE_QTY | DAY_OF_WEEK | DOCTOR_TIER'],
    ['reward_type',   'FIXED_PRICE | DISCOUNT_FIXED | DISCOUNT_PERCENT | FREE_PRODUCT'],
    ['value_text (CUSTOMER_ATTRIBUTE)', 'STUDENT_TEACHER | PARENT_OF_EXCELLENT_STUDENT | MOTHER_AND_CHILD'],
    ['value_text (DOCTOR_TIER)',        'OWN_DOCTOR | OTHER_DOCTOR'],
    ['value_text (DAY_OF_WEEK)',        'WEEKEND | WEEKDAY'],
    ['promotion_type', 'REGULAR | FLASH_SALE'],
    ['invoice status', 'DRAFT | PENDING | APPROVED | PAID | CANCELLED'],
  ];
  enums.forEach(function(e) {
    sheet.getRange(row + 2, 1).setValue(e[0]).setFontWeight('bold');
    sheet.getRange(row + 2, 2, 1, 3).merge().setValue(e[1]);
    row++;
  });

  sheet.setColumnWidth(1, 200);
  sheet.setColumnWidth(2, 100);
  sheet.setColumnWidth(3, 60);
  sheet.setColumnWidth(4, 450);
  sheet.setFrozenRows(4);
  sheet.setTabColor('#263238');
}

// ============================================================
//  TẠO 1 SHEET BẢNG
// ============================================================
function _createTableSheet(ss, tbl) {
  let sheet = ss.getSheetByName(tbl.name);
  if (sheet) ss.deleteSheet(sheet);
  sheet = ss.insertSheet(tbl.name);

  const numCols = tbl.cols.length;

  // Dòng 1: tên bảng + nhóm
  sheet.getRange(1, 1, 1, numCols).merge()
    .setValue('🗄️  ' + tbl.name.toUpperCase() + '   [' + tbl.group + ']')
    .setBackground(tbl.color).setFontColor('#FFFFFF')
    .setFontSize(11).setFontWeight('bold');

  // Dòng 2: mô tả bảng
  const noteText = Array.isArray(tbl.note) ? tbl.note.join(' | ') : (tbl.note || '');
  sheet.getRange(2, 1, 1, numCols).merge()
    .setValue(noteText)
    .setBackground('#ECEFF1').setFontColor('#546E7A')
    .setFontSize(9).setWrap(true);

  // Dòng 3: header cột
  const headers = tbl.cols.map(function(c) { return c.key; });
  const hdrRange = sheet.getRange(3, 1, 1, numCols);
  hdrRange.setValues([headers])
    .setBackground('#455A64').setFontColor('#FFFFFF')
    .setFontWeight('bold').setFontSize(10);

  // Màu nền cột bắt buộc, ghi chú cột
  tbl.cols.forEach(function(col, i) {
    const colIdx = i + 1;
    if (col.req) {
      sheet.getRange(3, colIdx).setBackground('#1A237E').setFontColor('#FFEB3B');
    }
    if (col.note) {
      const cell = sheet.getRange(3, colIdx);
      cell.setNote(col.note);
    }
    // Độ rộng cột theo nội dung
    const w = Math.max(100, col.key.length * 9 + 20);
    sheet.setColumnWidth(colIdx, Math.min(w, 220));
  });

  // Freeze 3 dòng đầu (không freeze cột vì dòng 1-2 merge toàn bảng)
  sheet.setFrozenRows(3);

  // Tab màu theo nhóm
  sheet.setTabColor(tbl.color);

  // Bỏ gridlines thừa (xóa cột thừa)
  const maxCols = sheet.getMaxColumns();
  if (maxCols > numCols + 2) {
    sheet.deleteColumns(numCols + 1, maxCols - numCols - 2);
  }
}

// ============================================================
//  SEED DỮ LIỆU MẪU
// ============================================================
function _seedData(ss, tbl, seed) {
  var rows = seed[tbl.name];
  if (!rows || rows.length === 0) return;
  var sheet = ss.getSheetByName(tbl.name);
  sheet.getRange(4, 1, rows.length, rows[0].length).setValues(rows);
  // zebra rows
  for (var i = 0; i < rows.length; i++) {
    sheet.getRange(4 + i, 1, 1, rows[0].length)
      .setBackground(i % 2 === 0 ? '#F5F5F5' : '#FFFFFF');
  }
}

// ============================================================
//  HÀM PHỤ: Chỉ reset dữ liệu sheet (giữ format header)
// ============================================================
function clearAllDataKeepHeaders() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const clearable = ['invoices', 'invoice_items', 'customers'];
  clearable.forEach(function(name) {
    const sheet = ss.getSheetByName(name);
    if (!sheet) return;
    const lastRow = sheet.getLastRow();
    if (lastRow > 3) {
      sheet.getRange(4, 1, lastRow - 3, sheet.getLastColumn()).clearContent();
    }
  });
  SpreadsheetApp.getUi().alert('Đã xóa dữ liệu giao dịch (giữ nguyên header và danh mục).');
}

// ============================================================
//  HÀM PHỤ: Xem thống kê nhanh
// ============================================================
function showStats() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const lines = TABLES.map(function(tbl) {
    const sheet = ss.getSheetByName(tbl.name);
    if (!sheet) return tbl.name + ': (chưa tạo)';
    const rows = Math.max(0, sheet.getLastRow() - 3);
    return tbl.name.padEnd(28) + rows + ' dòng';
  });
  SpreadsheetApp.getUi().alert('📊 Số dòng dữ liệu mỗi bảng\n\n' + lines.join('\n'));
}
