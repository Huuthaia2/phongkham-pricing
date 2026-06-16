# Database CTKM — `thammi_km.db` (SQLite v3)

Database quan hệ hoàn thiện cho **Chương trình Khuyến mãi**, dựng từ `docs/Converted files/thammi_data_v2.xlsx` và đã vá đủ 6 lỗ hổng (G1–G6) nêu trong [../docs/SCHEMA_KM_analysis.md](../docs/SCHEMA_KM_analysis.md).

## File
| File | Vai trò |
|---|---|
| `schema.sql` | DDL đầy đủ (17 bảng + 11 index + 2 view). Có ghi chú port MySQL. |
| `build_db.py` | Đọc xlsx → làm sạch → nạp vào `thammi_km.db`, in báo cáo kiểm tra. |
| `thammi_km.db` | **Database SQLite đã build** (chạy được ngay). |

## Dựng lại DB
```bash
cd db
python build_db.py          # tạo lại thammi_km.db từ xlsx
```

## So với thammi_data_v2 — đã vá
| Mã | Vá gì |
|---|---|
| G1 | `rule_conditions.criteria_type` hỗ trợ thêm `DOCTOR_TIER` (`OWN_DOCTOR`/`OTHER_DOCTOR`) → biểu diễn "giá theo bác sĩ". |
| G2 | `promo_rules.valid_from` / `valid_to` → ưu đãi đổi theo mốc ngày trong cùng KM ("từ 18/5..."). |
| G3 | `promo_rules.slots_used`, `combos.slots_used` + `invoice_items.applied_rule_id` → đếm "suất" đã dùng. |
| G4 | `combos.exclude_voucher` → combo siêu hời không cộng voucher. |
| G5 | `rule_rewards.reward_value` ép về **INTEGER** (bỏ `1e+06`). |
| G6 | Quy ước `promotion_branches` rỗng = áp dụng mọi chi nhánh (ghi trong schema). |
| + | Thêm **FOREIGN KEY** toàn bộ + index; 2 view `v_promotion_offers`, `v_combo_pricing`. |

## View tra cứu nhanh
- `v_promotion_offers` — mỗi dòng 1 ưu đãi (promotion + rule + reward + tên DV thưởng + suất còn lại).
- `v_combo_pricing` — combo kèm % tiết kiệm và cờ `warning='CHECK_PRICE'` cho dòng giá bất thường.

## ⚠️ Lỗi dữ liệu NGUỒN cần soát tay (không phải lỗi schema)
1. **Combo giá lệch — 41/69 dòng** `combo_price >= Σ giá lẻ thành phần`. Nguyên nhân: mapping `combo_items → service` thiếu/sai (vd combo #13 bán 100tr nhưng chỉ link tới DV tổng 660k). DB đã gắn cờ `CHECK_PRICE` trong `v_combo_pricing`.
   ```sql
   SELECT * FROM v_combo_pricing WHERE warning='CHECK_PRICE';
   ```
2. **Voucher mốc ≥60tr** (`voucher_tiers.id=2`) đang để `voucher_value = 30.000.000` nhưng KM gốc ghi "giảm thêm **3 triệu**" → đúng là `3.000.000`.
   ```sql
   UPDATE voucher_tiers SET voucher_value = 3000000 WHERE id = 2;  -- xác nhận trước khi chạy
   ```

## Ví dụ query
```sql
-- Dịch vụ X đang có KM gì còn hiệu lực hôm nay?
SELECT o.* FROM v_promotion_offers o
JOIN rule_conditions c ON c.rule_id = o.rule_id
WHERE c.criteria_type='SERVICE_SELECTED' AND c.target_service_id = :sid
  AND date('now') BETWEEN o.start_date AND o.end_date;

-- Bill 80tr được voucher bao nhiêu?
SELECT voucher_value, voucher_duration_days FROM voucher_tiers
WHERE promotion_id=:pid AND min_bill_amount<=80000000
ORDER BY min_bill_amount DESC LIMIT 1;
```
