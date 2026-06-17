# -*- coding: utf-8 -*-
"""
generate_gs.py
Đọc thammi_km.db → generate Setup_KM_Database.gs với đầy đủ data nhúng sẵn.
- Bảng ≤500 dòng: inline trong getSeed()
- Bảng >500 dòng (services, service_prices): chunk vào helper functions
  (tránh GAS lỗi "script too large" cho từng function)

Chạy:
    python db/generate_gs.py
→ Ghi đè Setup_KM_Database.gs
"""
import os, sqlite3, sys, io

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8")

BASE    = os.path.dirname(os.path.abspath(__file__))
DB      = os.path.join(BASE, "thammi_km.db")
IN_GS   = os.path.join(BASE, "..", "Setup_KM_Database.gs")
OUT_GS  = os.path.join(BASE, "..", "Setup_KM_Database.gs")

CHUNK   = 500   # dòng/chunk cho bảng lớn
LARGE   = {"services", "service_prices"}  # bảng cần chunk

TABLES_ORDER = [
    "branches", "service_categories", "services", "service_prices",
    "customers", "employees",
    "promotions", "promotion_categories", "promotion_branches",
    "promo_rules", "rule_conditions", "rule_rewards",
    "combos", "combo_items", "voucher_tiers",
    "invoices", "invoice_items",
]


# ─── Chuyển giá trị Python → literal JS ───────────────────────────────────

def js_val(v):
    if v is None:
        return "''"
    if isinstance(v, bool):
        return "true" if v else "false"
    if isinstance(v, (int,)):
        return str(v)
    if isinstance(v, float):
        if v == int(v):
            return str(int(v))
        return str(v)
    s = (str(v)
         .replace("\\", "\\\\")
         .replace("'", "\\'")
         .replace("\r\n", "\\n")
         .replace("\n", "\\n")
         .replace("\r", ""))
    return f"'{s}'"


def rows_to_js(rows, indent="    "):
    """list of tuples → JS array-of-arrays string."""
    lines = []
    for row in rows:
        cells = ", ".join(js_val(v) for v in row)
        lines.append(f"{indent}[{cells}]")
    return "[\n" + ",\n".join(lines) + "\n  ]"


# ─── Đọc data từ SQLite ────────────────────────────────────────────────────

con = sqlite3.connect(DB)
data = {}
for t in TABLES_ORDER:
    try:
        data[t] = con.execute(f"SELECT * FROM {t}").fetchall()
    except Exception as e:
        print(f"  [WARN] {t}: {e}")
        data[t] = []
con.close()

print("=== Đọc DB xong ===")
for t in TABLES_ORDER:
    print(f"  {t:28} {len(data[t])} dòng")


# ─── Đọc file GAS gốc → tách phần trước/sau getSeed() ────────────────────

with open(IN_GS, encoding="utf-8") as f:
    src = f.read()

# Anchor trước phần seed/chunk (bền với cả file gốc lẫn file đã generate)
ANCHOR_BEFORE = "// ── CHUNK HELPERS"
ANCHOR_AFTER  = "// ── TIỆN ÍCH"

if ANCHOR_BEFORE in src:
    # file đã generate lần trước
    idx_s = src.index(ANCHOR_BEFORE)
else:
    # file gốc (chưa generate lần nào): cắt từ dòng seed comment
    idx_s = src.index("// ── DỮ LIỆU MẪU")

idx_e = src.index(ANCHOR_AFTER, idx_s)

before = src[:idx_s]           # hết phần TABLES
after  = src[idx_e:]           # từ // ── TIỆN ÍCH trở đi


# ─── Sinh chunk helpers cho bảng lớn ──────────────────────────────────────

chunk_fns = []   # danh sách code của các helper function

for tname in LARGE:
    rows = data.get(tname, [])
    if not rows:
        continue
    for ci, start in enumerate(range(0, len(rows), CHUNK)):
        chunk = rows[start:start + CHUNK]
        fn_name = f"_d_{tname}_{ci}"
        body = rows_to_js(chunk)
        chunk_fns.append(
            f"function {fn_name}() {{\n  return {body};\n}}"
        )

chunk_block = "\n\n".join(chunk_fns)


# ─── Sinh getSeed() ────────────────────────────────────────────────────────

seed_props = []

for tname in TABLES_ORDER:
    rows = data.get(tname, [])
    if not rows:
        # bảng rỗng → mảng []
        seed_props.append(f"    {tname}: []")
        continue

    if tname in LARGE:
        # ghép từ chunk helpers
        num_chunks = (len(rows) + CHUNK - 1) // CHUNK
        # dùng .concat() thay + vì JS array + array → string
        first = f"_d_{tname}_0()"
        rest  = ", ".join(f"_d_{tname}_{ci}()" for ci in range(1, num_chunks))
        if rest:
            expr = f"{first}.concat({rest})"
        else:
            expr = first
        seed_props.append(f"    {tname}: {expr}")
    else:
        arr = rows_to_js(rows, indent="      ")
        seed_props.append(f"    {tname}: {arr}")

get_seed_fn = (
    "// ── DỮ LIỆU MẪU (seed) — AUTO-GENERATED từ thammi_km.db ──\n"
    "function getSeed() {\n"
    "  return {\n"
    + ",\n".join(seed_props)
    + "\n  };\n"
    "}"
)


# ─── Gộp lại và ghi file ──────────────────────────────────────────────────

separator = "\n// ── CHUNK HELPERS (sinh tự động, bảng lớn) ──────────────────────────\n\n"

output = before + separator + chunk_block + "\n\n" + get_seed_fn + "\n" + after

with open(OUT_GS, "w", encoding="utf-8") as f:
    f.write(output)

size_kb = len(output.encode("utf-8")) / 1024
print(f"\n✅ Đã ghi {OUT_GS}")
print(f"   Kích thước: {size_kb:.0f} KB")
print(f"   (GAS limit ~1024 KB — {'⚠️ SẮP QUÁ' if size_kb > 900 else 'OK'})")
