-- ============================================================
--  THẨM MỸ HOÀNG TUẤN — DATABASE KHUYẾN MÃI (CTKM)
--  Phiên bản: v3 (hoàn thiện từ thammi_data_v2)
--  Engine: SQLite 3 (chú thích cách port MySQL ở cuối)
--  Tiền tệ: lưu INTEGER theo VND (không dùng float)
-- ============================================================
PRAGMA foreign_keys = ON;

-- ---------- 1. DANH MỤC ----------
CREATE TABLE branches (
    id           INTEGER PRIMARY KEY,
    branch_code  TEXT UNIQUE NOT NULL,
    branch_name  TEXT NOT NULL,
    address      TEXT,
    is_active    INTEGER NOT NULL DEFAULT 1,
    created_at   TEXT,
    updated_at   TEXT
);

CREATE TABLE service_categories (
    id             INTEGER PRIMARY KEY,
    parent_id      INTEGER REFERENCES service_categories(id),
    category_code  TEXT,
    category_name  TEXT NOT NULL,
    category_level INTEGER,
    display_order  INTEGER,
    created_at     TEXT
);

CREATE TABLE services (
    id                 INTEGER PRIMARY KEY,
    category_id        INTEGER REFERENCES service_categories(id),
    service_group_code TEXT,
    item_code          TEXT,
    item_name          TEXT NOT NULL,
    unit               TEXT,
    tags               TEXT,
    is_active          INTEGER NOT NULL DEFAULT 1,
    created_at         TEXT,
    updated_at         TEXT
);

CREATE TABLE service_prices (
    id             INTEGER PRIMARY KEY,
    service_id     INTEGER NOT NULL REFERENCES services(id),
    branch_id      INTEGER REFERENCES branches(id),   -- NULL = áp dụng mọi chi nhánh
    price_type     TEXT DEFAULT 'STANDARD',
    base_price     INTEGER NOT NULL DEFAULT 0,        -- VND
    effective_date TEXT,
    end_date       TEXT,
    is_current     INTEGER NOT NULL DEFAULT 1
);

-- ---------- 2. CON NGƯỜI ----------
CREATE TABLE customers (
    id            INTEGER PRIMARY KEY,
    full_name     TEXT,
    phone_number  TEXT,
    date_of_birth TEXT,
    gender        TEXT,
    occupation    TEXT,
    customer_type TEXT,
    created_at    TEXT
);

CREATE TABLE employees (
    id            INTEGER PRIMARY KEY,
    employee_code TEXT UNIQUE,
    full_name     TEXT NOT NULL,
    email         TEXT,
    phone_number  TEXT,
    role          TEXT,                                -- ADMIN|CONSULTANT|CASHIER|MANAGER|DOCTOR
    branch_id     INTEGER REFERENCES branches(id),
    username      TEXT,
    password_hash TEXT,
    status        TEXT DEFAULT 'ACTIVE',
    created_at    TEXT
);

-- ---------- 3. KHUYẾN MÃI ----------
CREATE TABLE promotions (
    id                       INTEGER PRIMARY KEY,
    promotion_name           TEXT NOT NULL,
    promotion_type           TEXT,                     -- REGULAR|FLASH_SALE
    start_date               TEXT,
    end_date                 TEXT,
    applicable_days          TEXT,                     -- NULL/'' = mọi ngày
    max_discount_percent_cap INTEGER,                  -- trần tổng KM (vd 50)
    is_stackable             INTEGER NOT NULL DEFAULT 0,
    description              TEXT,
    is_active                INTEGER NOT NULL DEFAULT 1,
    created_at               TEXT,
    updated_at               TEXT
);

-- M:N — KM áp dụng cho nhóm DV nào
CREATE TABLE promotion_categories (
    promotion_id INTEGER NOT NULL REFERENCES promotions(id),
    category_id  INTEGER NOT NULL REFERENCES service_categories(id),
    PRIMARY KEY (promotion_id, category_id)
);

-- M:N — KM áp dụng cho chi nhánh nào. QUY ƯỚC: không có dòng nào => mọi chi nhánh
CREATE TABLE promotion_branches (
    promotion_id INTEGER NOT NULL REFERENCES promotions(id),
    branch_id    INTEGER NOT NULL REFERENCES branches(id),
    PRIMARY KEY (promotion_id, branch_id)
);

CREATE TABLE promo_rules (
    id                       INTEGER PRIMARY KEY,
    promotion_id             INTEGER NOT NULL REFERENCES promotions(id),
    rule_name                TEXT NOT NULL,
    valid_from               TEXT,                     -- [G2] mốc ngày con trong cùng KM (vd "từ 18/5")
    valid_to                 TEXT,                     -- [G2]
    rule_priority            INTEGER NOT NULL DEFAULT 0,
    is_exclusive_rule        INTEGER NOT NULL DEFAULT 0,
    is_stackable_with_others INTEGER NOT NULL DEFAULT 1,
    max_applications         INTEGER,                  -- số suất tối đa (NULL = không giới hạn)
    slots_used               INTEGER NOT NULL DEFAULT 0, -- [G3] số suất đã dùng
    created_at               TEXT
);

CREATE TABLE rule_conditions (
    id                 INTEGER PRIMARY KEY,
    rule_id            INTEGER NOT NULL REFERENCES promo_rules(id),
    condition_group    INTEGER NOT NULL DEFAULT 1,     -- AND trong nhóm, OR giữa các nhóm
    criteria_type      TEXT NOT NULL,                  -- SERVICE_SELECTED|GROUP_SIZE|CUSTOMER_ATTRIBUTE|SERVICE_QTY|DAY_OF_WEEK|DOCTOR_TIER
    operator           INTEGER DEFAULT 0,              -- 0:=  1:>=  2:<=  3:>  4:<  5:between
    value_num          INTEGER,
    value_num_max      INTEGER,
    value_text         TEXT,                           -- STUDENT_TEACHER|WEEKEND|OWN_DOCTOR|OTHER_DOCTOR...
    target_service_id  INTEGER REFERENCES services(id),
    target_category_id INTEGER REFERENCES service_categories(id)
);

CREATE TABLE rule_rewards (
    id                        INTEGER PRIMARY KEY,
    rule_id                   INTEGER NOT NULL REFERENCES promo_rules(id),
    reward_type               TEXT NOT NULL,           -- FIXED_PRICE|DISCOUNT_PERCENT|DISCOUNT_FIXED|FREE_PRODUCT
    reward_value              INTEGER,                 -- [G5] numeric VND hoặc % (tùy reward_type); NULL với FREE_PRODUCT
    target_service_id         INTEGER REFERENCES services(id),
    gift_description          TEXT,
    voucher_duration_days     INTEGER,
    installment_months        INTEGER,
    installment_rate          REAL,
    recurring_interval_months INTEGER
);

CREATE TABLE combos (
    id                   INTEGER PRIMARY KEY,
    promotion_id         INTEGER REFERENCES promotions(id),
    combo_name           TEXT NOT NULL,
    original_total_price INTEGER,                      -- = Σ giá lẻ thành phần (tính lại từ combo_items)
    combo_price          INTEGER,                      -- giá bán combo
    allow_extra_rules    INTEGER NOT NULL DEFAULT 0,
    exclude_voucher      INTEGER NOT NULL DEFAULT 0,   -- [G4] combo siêu hời = 1 (ko cộng voucher)
    max_slots            INTEGER,
    slots_used           INTEGER NOT NULL DEFAULT 0,   -- [G3]
    is_active            INTEGER NOT NULL DEFAULT 1,
    created_at           TEXT
);

CREATE TABLE combo_items (
    id               INTEGER PRIMARY KEY,
    combo_id         INTEGER NOT NULL REFERENCES combos(id),
    service_id       INTEGER NOT NULL REFERENCES services(id),
    quantity         INTEGER NOT NULL DEFAULT 1,
    allocated_price  INTEGER,
    item_description TEXT
);

CREATE TABLE voucher_tiers (
    id                    INTEGER PRIMARY KEY,
    promotion_id          INTEGER NOT NULL REFERENCES promotions(id),
    min_bill_amount       INTEGER NOT NULL,            -- VND
    voucher_value         INTEGER NOT NULL,            -- VND
    voucher_duration_days INTEGER
);

-- ---------- 4. GIAO DỊCH ----------
CREATE TABLE invoices (
    id                   INTEGER PRIMARY KEY,
    customer_id          INTEGER REFERENCES customers(id),
    branch_id            INTEGER REFERENCES branches(id),
    consultant_id        INTEGER REFERENCES employees(id),
    total_original_price INTEGER,
    total_discount       INTEGER,
    final_price          INTEGER,
    status               TEXT,
    created_at           TEXT
);

CREATE TABLE invoice_items (
    id              INTEGER PRIMARY KEY,
    invoice_id      INTEGER NOT NULL REFERENCES invoices(id),
    service_id      INTEGER REFERENCES services(id),
    doctor_id       INTEGER REFERENCES employees(id),
    quantity        INTEGER NOT NULL DEFAULT 1,
    base_price      INTEGER,
    discount_amount INTEGER,
    final_price     INTEGER,
    applied_rule_id INTEGER REFERENCES promo_rules(id),  -- [G3] truy vết suất đã dùng
    created_at      TEXT
);

-- ---------- 5. INDEX ----------
CREATE INDEX idx_services_cat     ON services(category_id);
CREATE INDEX idx_price_service    ON service_prices(service_id, is_current);
CREATE INDEX idx_rule_promo       ON promo_rules(promotion_id, is_exclusive_rule);
CREATE INDEX idx_cond_rule        ON rule_conditions(rule_id, condition_group);
CREATE INDEX idx_cond_service     ON rule_conditions(target_service_id);
CREATE INDEX idx_reward_rule      ON rule_rewards(rule_id);
CREATE INDEX idx_combo_promo      ON combos(promotion_id, is_active);
CREATE INDEX idx_comboitem_combo  ON combo_items(combo_id);
CREATE INDEX idx_voucher_promo    ON voucher_tiers(promotion_id, min_bill_amount);
CREATE INDEX idx_prom_active      ON promotions(is_active, start_date, end_date);
CREATE INDEX idx_invitem_rule     ON invoice_items(applied_rule_id);

-- ---------- 6. VIEW HỖ TRỢ TRUY VẤN ----------
-- 6.1 Bảng KM "phẳng": mỗi dòng = 1 ưu đãi của 1 rule
CREATE VIEW v_promotion_offers AS
SELECT
    p.id   AS promotion_id, p.promotion_name, p.promotion_type,
    p.start_date, p.end_date, p.is_active AS promo_active,
    r.id   AS rule_id, r.rule_name, r.valid_from, r.valid_to,
    r.is_exclusive_rule, r.is_stackable_with_others,
    r.max_applications, r.slots_used,
    (CASE WHEN r.max_applications IS NULL THEN NULL
          ELSE r.max_applications - r.slots_used END) AS slots_remaining,
    rw.reward_type, rw.reward_value,
    rw.target_service_id, sr.item_name AS reward_service_name,
    rw.gift_description, rw.voucher_duration_days
FROM promotions p
JOIN promo_rules  r  ON r.promotion_id = p.id
JOIN rule_rewards rw ON rw.rule_id     = r.id
LEFT JOIN services sr ON sr.id = rw.target_service_id;

-- 6.2 Combo kèm % tiết kiệm + cảnh báo dữ liệu giá
CREATE VIEW v_combo_pricing AS
SELECT
    c.id, c.combo_name, c.promotion_id,
    c.original_total_price, c.combo_price,
    (c.original_total_price - c.combo_price) AS saving_amount,
    CASE WHEN c.original_total_price > 0
         THEN ROUND(100.0 * (c.original_total_price - c.combo_price) / c.original_total_price, 1)
         END AS saving_percent,
    CASE WHEN c.combo_price >= c.original_total_price THEN 'CHECK_PRICE' END AS warning,
    c.exclude_voucher, c.max_slots, c.slots_used
FROM combos c;

-- ============================================================
-- GHI CHÚ PORT SANG MySQL/MariaDB:
--   - INTEGER PRIMARY KEY  -> BIGINT AUTO_INCREMENT PRIMARY KEY
--   - INTEGER (tiền)       -> BIGINT
--   - REAL                 -> DECIMAL(5,2)
--   - TEXT                 -> VARCHAR(n) / TEXT
--   - Bỏ PRAGMA; thêm ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
--   - Cân nhắc CHECK(... IN (...)) cho enum, hoặc ENUM(...)
-- ============================================================
