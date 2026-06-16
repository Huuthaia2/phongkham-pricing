# -*- coding: utf-8 -*-
"""
Build SQLite DB khuyến mãi (CTKM) từ thammi_data_v2.xlsx.
- Áp schema v3 (db/schema.sql)
- Làm sạch: reward_value -> numeric (G5); tính lại combos.original_total_price từ combo_items (sửa lỗi đảo giá)
- Nạp dữ liệu, bật foreign_keys, tạo view (đã nằm trong schema.sql)
"""
import os, sqlite3, math, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")
import pandas as pd

BASE   = os.path.dirname(os.path.abspath(__file__))
XLSX   = os.path.join(BASE, "..", "docs", "Converted files", "thammi_data_v2.xlsx")
SCHEMA = os.path.join(BASE, "schema.sql")
DBFILE = os.path.join(BASE, "thammi_km.db")


def to_int(v):
    """'1e+06', '500000', 5e6, '', NaN -> int | None"""
    if v is None:
        return None
    if isinstance(v, float) and math.isnan(v):
        return None
    s = str(v).strip()
    if s == "" or s.lower() == "nan":
        return None
    try:
        return int(round(float(s)))
    except ValueError:
        return None


def clean(df):
    """NaN -> None để sqlite nhận NULL."""
    return df.where(pd.notnull(df), None)


def main():
    if os.path.exists(DBFILE):
        os.remove(DBFILE)

    xls = pd.ExcelFile(XLSX, engine="openpyxl")
    con = sqlite3.connect(DBFILE)
    con.execute("PRAGMA foreign_keys = OFF")  # tắt khi nạp, bật lại để kiểm tra sau
    with open(SCHEMA, encoding="utf-8") as f:
        con.executescript(f.read())

    # Thứ tự nạp tôn trọng FK (cha trước con)
    order = [
        "branches", "service_categories", "services", "service_prices",
        "customers", "employees",
        "promotions", "promotion_categories", "promotion_branches",
        "promo_rules", "rule_conditions", "rule_rewards",
        "combos", "combo_items", "voucher_tiers",
        "invoices", "invoice_items",
    ]

    # cột số tiền cần ép kiểu int
    money_cols = {
        "service_prices": ["base_price"],
        "rule_rewards":   ["reward_value"],
        "rule_conditions":["value_num", "value_num_max"],
        "combos":         ["original_total_price", "combo_price"],
        "combo_items":    ["allocated_price"],
        "voucher_tiers":  ["min_bill_amount", "voucher_value"],
    }

    # đọc trước combos/combo_items/service_prices để tính lại giá gốc combo
    sp = xls.parse("service_prices")
    price_map = {}
    for _, r in sp[sp["is_current"] == 1].iterrows():
        price_map[int(r["service_id"])] = to_int(r["base_price"]) or 0
    ci = xls.parse("combo_items")
    recomputed = {}
    for _, r in ci.iterrows():
        cid = int(r["combo_id"])
        qty = to_int(r["quantity"]) or 1
        recomputed[cid] = recomputed.get(cid, 0) + qty * price_map.get(int(r["service_id"]), 0)

    for table in order:
        df = clean(xls.parse(table))

        # chỉ giữ cột có trong schema (schema có thêm cột mới: valid_from, slots_used, exclude_voucher...)
        cols_db = [c[1] for c in con.execute(f"PRAGMA table_info({table})").fetchall()]
        df = df[[c for c in df.columns if c in cols_db]]

        # ép kiểu tiền
        for c in money_cols.get(table, []):
            if c in df.columns:
                df[c] = df[c].map(to_int)

        # SỬA LỖI GIÁ COMBO: original_total_price = Σ giá lẻ thành phần
        if table == "combos":
            df["original_total_price"] = df["id"].map(lambda i: recomputed.get(int(i)))

        df.to_sql(table, con, if_exists="append", index=False)

    con.commit()

    # bật FK và kiểm tra toàn vẹn
    con.execute("PRAGMA foreign_keys = ON")
    violations = con.execute("PRAGMA foreign_key_check").fetchall()

    # ====== BÁO CÁO ======
    def q(sql):
        return con.execute(sql).fetchall()

    print("=== ĐÃ TẠO DB:", DBFILE)
    print("\n-- Số dòng mỗi bảng --")
    for t in order:
        n = q(f"SELECT COUNT(*) FROM {t}")[0][0]
        print(f"  {t:22} {n}")

    print("\n-- FK vi phạm --", len(violations))
    for v in violations[:10]:
        print("   ", v)

    print("\n-- reward_type (đã numeric hóa reward_value) --")
    for rt, n, mn, mx in q("""SELECT reward_type, COUNT(*),
                                     MIN(reward_value), MAX(reward_value)
                              FROM rule_rewards GROUP BY reward_type"""):
        print(f"   {rt:16} n={n:4}  min={mn}  max={mx}")

    print("\n-- Combo còn cảnh báo giá sau khi tính lại (combo_price >= original) --")
    warn = q("SELECT COUNT(*) FROM v_combo_pricing WHERE warning='CHECK_PRICE'")[0][0]
    print(f"   {warn}/69 combo vẫn lệch (combo_price >= Σ giá lẻ) -> cần soát tay")
    for row in q("""SELECT id, combo_name, original_total_price, combo_price
                    FROM v_combo_pricing WHERE warning='CHECK_PRICE' LIMIT 8"""):
        print("   ", row)

    print("\n-- DEMO: top 5 combo tiết kiệm nhất --")
    for row in q("""SELECT id, substr(combo_name,1,45), saving_percent
                    FROM v_combo_pricing
                    WHERE saving_percent IS NOT NULL
                    ORDER BY saving_percent DESC LIMIT 5"""):
        print("   ", row)

    con.close()


if __name__ == "__main__":
    main()
