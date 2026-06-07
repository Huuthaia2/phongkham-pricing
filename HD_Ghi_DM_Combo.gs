// ============================================================
// HƯỚNG DẪN GHI DỮ LIỆU SHEET DM_Combo
// ============================================================
// File này chỉ là TÀI LIỆU THAM KHẢO — không chạy code.
// Cập nhật khi có thay đổi quy tắc combo.
// ============================================================


// ============================================================
// 1. CẤU TRÚC SHEET DM_Combo (các cột cần có)
// ============================================================
//
//  Cột              | Kiểu    | Bắt buộc | Mô tả
//  -----------------|---------|----------|-----------------------------
//  MaCombo          | Text    | ✓        | Mã định danh. VD: KMCB-01
//  TenCombo         | Text    | ✓        | Tên hiển thị
//  LoaiGia          | Enum    | ✓        | Xem mục 2 bên dưới
//  GiaCombo         | Number  |          | Giá cố định (VND, không dấu phẩy)
//  PhanTramGiam     | Number  |          | Tỷ lệ giảm: 0.35 = giảm 35%
//  DieuKienApDung   | Text    | ✓        | Xem mục 3 bên dưới
//  QuaTang          | Text    |          | Quà tặng kèm (nếu có)
//  GhiChu           | Text    |          | Ghi chú nội bộ
//  TrangThai        | Enum    | ✓        | "Đang áp dụng" / "Ngừng áp dụng"


// ============================================================
// 2. GIÁ TRỊ CỘT LoaiGia
// ============================================================
//
//  GIA_TONG
//    → GiaCombo là tổng giá cho TOÀN BỘ dịch vụ trong combo.
//    → Hệ thống chia tỷ lệ cho từng DV theo giá niêm yết.
//    → Dùng khi: CB-02, 03, 04, 05, 06, 07, 08.
//    → Bắt buộc điền GiaCombo. Để trống PhanTramGiam.
//
//  GIA_ANCHOR
//    → GiaCombo chỉ áp dụng cho DV được đánh dấu * trong DieuKienApDung.
//    → Các DV còn lại giữ nguyên giá TQ-01.
//    → Dùng khi: CB-09 đến CB-22.
//    → Bắt buộc điền GiaCombo. Để trống PhanTramGiam.
//
//  GIAM_PHAN_TRAM
//    → Giảm PhanTramGiam% cho DV được đánh dấu * trong DieuKienApDung.
//    → Dùng khi: CB-20, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32.
//    → Bắt buộc điền PhanTramGiam. Để trống GiaCombo.


// ============================================================
// 3. CÁCH VIẾT CỘT DieuKienApDung
// ============================================================
//
//  ── Quy tắc chung ──────────────────────────────────────────
//
//  • Dùng dấu + để phân cách các điều kiện (AND — tất cả phải thỏa)
//  • Thêm * ngay sau token để đánh dấu DV nhận giá ưu đãi/giảm giá
//  • Chỉ được có 1 token * trong 1 combo
//
//  ── Các loại token ─────────────────────────────────────────
//
//  [A] EXACT — DV cụ thể phải có trong giỏ
//      Cú pháp : DV-XXX
//      Ví dụ   : DV-034
//                DV-061
//
//  [B] OR_EXACT — Có ít nhất 1 DV trong tập hợp
//      Cú pháp : DV-XXX~YYY           (range liên tục)
//                DV-XXX,DV-YYY        (danh sách rời)
//                DV-XXX~YYY,DV-AAA~BBB  (kết hợp)
//      Ví dụ   : DV-034~040           → bất kỳ DV nào từ 034 đến 040
//                DV-046,DV-059        → DV-046 hoặc DV-059
//
//  [C] RANGE_MIN — Có ít nhất N DV trong tập hợp (N >= 2)
//      Cú pháp : [tập hợp]>=N
//      Ví dụ   : DV-046~051>=4        → ít nhất 4 DV từ 046~051
//                DV-046~048,DV-058~060>=4  → ít nhất 4 từ 2 dải gộp lại
//
//  [D] ANY_TQ01 — Có ít nhất 1 DV lẻ thỏa điều kiện TQ-01
//      Điều kiện: NhomKM = "TQ-01"  VÀ  ApDungDongThoi_TQ = "Có"
//                 VÀ  GiaSauKM >= giaMin  VÀ  không phải DV đánh dấu *
//      Cú pháp : TQ01>=giaMin
//      Ví dụ   : TQ01>=5000000       → ít nhất 1 DV TQ-01 giá >= 5 triệu
//
//  [E] TAG — Có ít nhất N DV thuộc nhóm tag (khai báo trong DM_DichVu)
//      Cú pháp : TAG:tenTag>=N
//      Ví dụ   : TAG:nhomSun>=2      → ít nhất 2 DV thuộc nhóm "nhomSun"
//                TAG:tangGiua>=1     → ít nhất 1 DV thuộc nhóm "tangGiua"
//
//  ── Ký hiệu * (target) ─────────────────────────────────────
//
//  GIA_ANCHOR    : DV có * → nhận GiaCombo thay giá TQ-01
//  GIAM_PHAN_TRAM: DV có * → giảm PhanTramGiam%
//  GIA_TONG      : không cần * (giá chia đều theo tỷ lệ)


// ============================================================
// 4. DỮ LIỆU 32 COMBO (dán vào sheet DM_Combo)
// ============================================================
//
//  ⚠️  [pending] = chưa có mã DV, điền sau khi có ID từ DM_DichVu
//  ⚠️  TAG:nhomSun và TAG:tangGiua = cần thêm cột Tag vào DM_DichVu
//
//  MaCombo  | LoaiGia        | GiaCombo  | PhanTramGiam | DieuKienApDung
//  ---------|----------------|-----------|--------------|----------------------------------
//  KMCB-01  | GIA_TONG       | 35000000  |              | TAG:nhomSun>=2                   [pending nhóm sụn]
//  KMCB-02  | GIA_TONG       | 35000000  |              | DV-011 + DV-020
//  KMCB-03  | GIA_TONG       | 60000000  |              | DV-011 + DV-021
//  KMCB-04  | GIA_TONG       | 100000000 |              | DV-064~065>=2                    [pending xác nhận]
//  KMCB-05  | GIA_TONG       | 100000000 |              | DV-035 + DV-046~051>=4 + DV-061
//  KMCB-06  | GIA_TONG       | 95000000  |              | DV-034 + DV-046~051>=4 + DV-061
//  KMCB-07  | GIA_TONG       | 79000000  |              | DV-036 + DV-046~051>=4 + DV-061
//  KMCB-08  | GIA_TONG       | 68000000  |              | DV-037 + DV-046~051>=4 + DV-061
//  KMCB-09  | GIA_ANCHOR     | 20000000  |              | DV-005* + TQ01>=5000000
//  KMCB-10  | GIA_ANCHOR     | 32000000  |              | DV-004* + TQ01>=5000000          [QuaTang: Tặng tê]
//  KMCB-11  | GIA_ANCHOR     | 50000000  |              | DV-003* + TQ01>=5000000
//  KMCB-12  | GIA_ANCHOR     | 18000000  |              | DV-014* + TQ01>=5000000
//  KMCB-13  | GIA_ANCHOR     | 42000000  |              | DV-015* + TQ01>=5000000
//  KMCB-14  | GIA_ANCHOR     | 18000000  |              | DV-018* + TQ01>=5000000
//  KMCB-15  | GIA_ANCHOR     | 18000000  |              | DV-020* + TQ01>=5000000
//  KMCB-16  | GIA_ANCHOR     | 22500000  |              | DV-022* + TQ01>=5000000
//  KMCB-17  | GIA_ANCHOR     | 42000000  |              | DV-023* + TQ01>=5000000
//  KMCB-18  | GIA_ANCHOR     | 6000000   |              | DV-032* + TQ01>=5000000          [GhiChu: tính mỗi môi]
//  KMCB-19  | GIA_ANCHOR     | 3000000   |              | DV-030* + TQ01>=5000000          [GhiChu: tính mỗi bên]
//  KMCB-20  | GIAM_PHAN_TRAM |           | 0.5          | DV-024~029* + TQ01>=5000000
//  KMCB-21  | GIA_ANCHOR     | 2500000   |              | [pending]* + DV-064
//  KMCB-22  | GIA_ANCHOR     | 5000000   |              | [pending]* + DV-064
//  KMCB-23  | GIAM_PHAN_TRAM |           | 0.4          | DV-046~051>=4* + DV-061
//  KMCB-24  | GIAM_PHAN_TRAM |           | 0.5          | DV-062* + DV-046~051>=4 + DV-061
//  KMCB-25  | GIAM_PHAN_TRAM |           | 0.1          | [pending]* + DV-058~060
//  KMCB-26  | GIAM_PHAN_TRAM |           | 0.4          | [pending]* + DV-049~060
//  KMCB-27  | GIAM_PHAN_TRAM |           | 0.35         | DV-042* + DV-034~040
//  KMCB-28  | GIAM_PHAN_TRAM |           | 0.3          | [pending]* + DV-034~040
//  KMCB-29  | GIAM_PHAN_TRAM |           | 0.35         | TAG:tangGiua>=1 + [pending]*     [pending IDs]
//  KMCB-30  | GIAM_PHAN_TRAM |           | 0.5          | TAG:tangGiua>=1 + [pending]*     [pending IDs]
//  KMCB-31  | GIAM_PHAN_TRAM |           | 0.35         | TAG:tangGiua>=1 + [pending]*     [pending IDs]
//  KMCB-32  | GIAM_PHAN_TRAM |           | 0.35         | TAG:tangGiua>=1 + [pending]*     [pending IDs]


// ============================================================
// 5. KHAI BÁO TAG TRONG SHEET DM_DichVu
// ============================================================
//
//  Thêm cột "Tag" vào sheet DM_DichVu để dùng cho TOKEN loại [E].
//  Một DV có thể thuộc nhiều tag, ngăn cách bằng dấu phẩy.
//
//  Tag hiện cần khai báo:
//
//  Tag          | DV thuộc nhóm
//  -------------|---------------------------------------------
//  nhomSun      | Các DV độn sụn (pending — chờ danh sách)
//  tangGiua     | DV-020, DV-011, cắt mí dưới, treo cung mày
//               | (pending — chờ ID cắt mí dưới, treo cung mày)
//
//  Ví dụ cột Tag trong DM_DichVu:
//    DV-011 → Tag = "tangGiua"
//    DV-020 → Tag = "tangGiua"
//    DV-005 → Tag = "nhomSun"   (nếu Mũi Sline thuộc nhóm sụn)


// ============================================================
// 6. VÍ DỤ PARSE (để đối chiếu khi debug)
// ============================================================
//
//  DieuKienApDung = "DV-034 + DV-046~051>=4 + DV-061"
//  → Điều kiện 1: EXACT   — DV-034 phải có trong giỏ
//  → Điều kiện 2: RANGE_MIN — ≥4 DV trong {046,047,048,049,050,051}
//  → Điều kiện 3: EXACT   — DV-061 phải có trong giỏ
//  → LoaiGia = GIA_TONG → tổng 95tr chia theo tỷ lệ giá niêm yết
//
//  DieuKienApDung = "DV-005* + TQ01>=5000000"
//  → Điều kiện 1: EXACT (target) — DV-005 nhận GiaCombo = 20tr
//  → Điều kiện 2: ANY_TQ01 — ≥1 DV TQ-01 giá ≥ 5tr (trừ DV-005)
//  → LoaiGia = GIA_ANCHOR → DV-005 = 20tr, DV lẻ giữ giá TQ-01
//
//  DieuKienApDung = "DV-046~051>=4* + DV-061"
//  → Điều kiện 1: RANGE_MIN (target) — ≥4 DV hút mỡ, nhận giảm 40%
//  → Điều kiện 2: EXACT — DV-061 phải có (không bị giảm)
//  → LoaiGia = GIAM_PHAN_TRAM, PhanTramGiam = 0.4
//
//  DieuKienApDung = "DV-046~048,DV-058~060>=4*"
//  → Tập hợp = {DV-046,047,048,058,059,060}
//  → Cần ≥4 DV từ tập đó, các DV này nhận giảm giá


// ============================================================
// 7. LƯU Ý KHI NHẬP LIỆU
// ============================================================
//
//  ✓  Không có dấu cách thừa quanh dấu + và *
//     ĐÚNG : DV-005* + TQ01>=5000000
//     SAI  : DV-005 * + TQ01 >= 5000000
//
//  ✓  [pending] phải được thay bằng ID thực trước khi bật combo
//
//  ✓  GiaCombo nhập số nguyên, không dấu phẩy
//     ĐÚNG : 20000000
//     SAI  : 20,000,000
//
//  ✓  PhanTramGiam nhập số thập phân 0-1
//     ĐÚNG : 0.35  (= 35%)
//     SAI  : 35
//
//  ✓  TrangThai = "Ngừng áp dụng" để tắt combo tạm thời
//     mà không cần xóa dòng
