// ==========================================
// Cấu hình tên sheet và các tham số hệ thống
// ==========================================
const CONFIG = {
  SHEETS: {
    SERVICES: 'DM_DichVu',    // Sheet danh mục dịch vụ
    COMBOS: 'DM_Combo',       // Sheet danh mục combo
    RULES: 'DM_LuatKM',       // Sheet luật khuyến mãi
    STAFF: 'DM_NhanVien',     // Sheet nhân viên
    BQ_HEADER: 'BQ_Header',   // Sheet đầu phiếu báo giá
    BQ_DETAIL: 'BQ_ChiTiet'   // Sheet chi tiết báo giá
  },
  APPROVAL_THRESHOLD: 0.5,    // Ngưỡng cần duyệt (giảm giá > 50%)
  QUOTE_VALIDITY_DAYS: 7      // Báo giá có hiệu lực trong 7 ngày
};

// ==========================================
// 1. CÁC HÀM XỬ LÝ ĐẦU VÀO GET / POST (API)
// ==========================================

function doGet(e) {
  try {
    const path = e.parameter.path;
    let result;
    
    if (path === 'health') {
      result = makeSuccess({ status: 'OK' });
    } else if (path === 'services') {
      result = handleGetServices(e.parameter);
    } else if (path === 'combos') {
      result = handleGetCombos();
    } else if (path === 'rules') {
      result = handleGetRules();
    } else if (path === 'staff') {
      result = handleGetStaff(e.parameter.branch);
    } else if (path === 'quotes') {
      if (e.parameter.id) {
        result = handleGetQuote(e.parameter.id);
      } else {
        result = handleGetQuotes(e.parameter);
      }
    } else if (path === 'dashboard') {
      result = handleGetDashboard(e.parameter.branch);
    } else {
      result = makeError('Đường dẫn không hợp lệ: ' + path, 400);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify(makeError(err.toString(), 500)))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const path = e.parameter.path;
    let body = null;
    if (e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    
    let result;
    if (path === 'quotes') {
      result = handleCreateQuote(body);
    } else if (path === 'quotes/approve') {
      result = handleApproveQuote(body);
    } else if (path === 'quotes/deposit') {
      result = handleDepositQuote(body);
    } else if (path === 'calculate') {
      result = handleCalculate(body);
    } else {
      result = makeError('Đường dẫn không hợp lệ: ' + path, 400);
    }
    
    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify(makeError(err.toString(), 500)))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ==========================================
// 2. CÁC HÀM ĐỌC / GHI / CẬP NHẬT TRANG TÍNH
// ==========================================

function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(sheetName);
  if (!sh) throw new Error("Không tìm thấy sheet: " + sheetName);
  return sh;
}

function getHeaderRowInfo(sh) {
  const data = sh.getRange(1, 1, Math.min(5, sh.getLastRow() || 1), Math.max(1, sh.getLastColumn())).getValues();
  let headerIdx = 0;
  for (let i = 0; i < data.length; i++) {
    const nonEmpty = data[i].filter(c => c !== '' && c !== null).length;
    if (nonEmpty > 3) {
      headerIdx = i;
      break;
    }
  }
  return {
    index: headerIdx + 1,
    headers: data[headerIdx].map(h => String(h).trim())
  };
}

function getSheetData(sheetName) {
  const sh = getSheet(sheetName);
  const headerInfo = getHeaderRowInfo(sh);
  const headers = headerInfo.headers;
  const headerRowIdx = headerInfo.index;
  const lastRow = sh.getLastRow();
  
  if (lastRow <= headerRowIdx) return [];
  
  const data = sh.getRange(headerRowIdx + 1, 1, lastRow - headerRowIdx, headers.length).getValues();
  return data.map(row => {
    const obj = {};
    headers.forEach((h, idx) => {
      if (h) obj[h] = row[idx];
    });
    return obj;
  });
}

function appendRow(sheetName, obj) {
  const sh = getSheet(sheetName);
  const headerInfo = getHeaderRowInfo(sh);
  const headers = headerInfo.headers;
  const headerRowIdx = headerInfo.index;

  const rowData = headers.map(h => obj[h] !== undefined ? obj[h] : '');
  const lastRow = sh.getLastRow();
  let writeRow = lastRow + 1;

  if (lastRow > headerRowIdx) {
    const values = sh.getRange(headerRowIdx + 1, 1, lastRow - headerRowIdx, Math.min(3, sh.getLastColumn())).getValues();
    for (let i = 0; i < values.length; i++) {
      const isEmpty = values[i].every(val => val === '' || val === null || val === undefined);
      if (isEmpty) {
        writeRow = headerRowIdx + 1 + i;
        break;
      }
    }
  }

  sh.getRange(writeRow, 1, 1, rowData.length).setValues([rowData]);
  return { rowData, rowNum: writeRow };
}

function updateRow(sheetName, keyField, keyValue, updates) {
  const sh = getSheet(sheetName);
  const headerInfo = getHeaderRowInfo(sh);
  const headers = headerInfo.headers;
  const headerRowIdx = headerInfo.index;
  
  const keyIdx  = headers.indexOf(keyField);
  if (keyIdx === -1) throw new Error('Không tìm thấy trường khóa: ' + keyField);

  const lastRow = sh.getLastRow();
  if (lastRow <= headerRowIdx) return false;

  const dataRange = sh.getRange(headerRowIdx + 1, 1, lastRow - headerRowIdx, sh.getLastColumn());
  const data = dataRange.getValues();

  for (let i = 0; i < data.length; i++) {
    if (String(data[i][keyIdx]) === String(keyValue)) {
      const rowNum = headerRowIdx + 1 + i;
      Object.entries(updates).forEach(([field, val]) => {
        const colIdx = headers.indexOf(field);
        if (colIdx !== -1) sh.getRange(rowNum, colIdx + 1).setValue(val);
      });
      return true;
    }
  }
  return false;
}

// ==========================================
// 3. CÁC HÀM XỬ LÝ LOGIC NGHIỆP VỤ
// ==========================================

// Lấy danh sách dịch vụ
function handleGetServices(params) {
  const services = getSheetData(CONFIG.SHEETS.SERVICES);
  const groups = [];
  services.forEach(s => {
    if (s.NhomDichVu && groups.indexOf(s.NhomDichVu) === -1) {
      groups.push(s.NhomDichVu);
    }
  });
  return makeSuccess({ services, groups });
}

// Lấy danh sách Combo
function handleGetCombos() {
  const rawCombos = getSheetData(CONFIG.SHEETS.COMBOS);
  const combos = rawCombos.map(c => {
    const loaiCombo = String(c.LoaiCombo || '');
    let loaiGia;
    if (loaiCombo === 'Giá cố định') loaiGia = 'GIA_TONG';
    else if (loaiCombo === 'Giảm %')   loaiGia = 'GIAM_PHAN_TRAM';
    else loaiGia = loaiCombo; // fallback nếu đã dùng mã kỹ thuật

    let phanTramGiam = Number(c.GiamPhanTram) || 0;
    if (phanTramGiam > 1) phanTramGiam = phanTramGiam / 100; // chuyển 20 → 0.2

    return {
      MaCombo:        String(c.MaCombo        || ''),
      TenCombo:       String(c.TenCombo       || ''),
      LoaiGia:        loaiGia,
      GiaCombo:       Number(c.GiaCombo_CoDinh) || 0,
      PhanTramGiam:   phanTramGiam,
      DieuKienApDung: String(c.DieuKienApDung  || ''),
      QuaTang:        String(c.QuaTang         || ''),
      TrangThai:      String(c.TrangThai        || '')
    };
  });
  return makeSuccess({ combos });
}

// ── Combo matching helpers (port từ comboMatcher.js) ──────────────────────────

function expandSet_(setStr) {
  var ids = [];
  setStr.split(',').forEach(function(raw) {
    var part = raw.trim();
    if (!part) return;
    if (part.indexOf('~') !== -1) {
      var halves = part.split('~');
      var from = halves[0].trim(), to = halves[1].trim();
      var m = from.match(/^([A-Za-z-]+)(\d+)$/);
      if (!m) return;
      var prefix = m[1], padLen = m[2].length;
      var fromN = parseInt(m[2]), toN = parseInt(to.replace(prefix, ''));
      for (var i = fromN; i <= toN; i++) {
        ids.push(prefix + String(i).padStart(padLen, '0'));
      }
    } else {
      ids.push(part);
    }
  });
  return ids;
}

function parseConditions_(str) {
  if (!str || str.indexOf('[pending]') !== -1) return [];
  return str.split('+').map(function(raw) {
    var token = raw.trim();
    var isTarget = token.indexOf('*') !== -1;
    token = token.replace('*', '').trim();

    if (token.indexOf('TQ01>=') === 0) {
      return { type: 'ANY_TQ01', minPrice: Number(token.replace('TQ01>=', '')), isTarget: isTarget };
    }
    if (token.indexOf('TAG:') === 0) {
      var rest = token.replace('TAG:', '');
      if (rest.indexOf('>=') !== -1) {
        var parts = rest.split('>=');
        return { type: 'TAG', tag: parts[0].trim(), min: Number(parts[1]) || 1, isTarget: isTarget };
      }
      return { type: 'TAG', tag: rest.trim(), min: 1, isTarget: isTarget };
    }

    var setStr = token, minCount = 1;
    if (token.indexOf('>=') !== -1) {
      var idx = token.lastIndexOf('>=');
      setStr = token.substring(0, idx);
      minCount = Number(token.substring(idx + 2)) || 1;
    }
    var ids = expandSet_(setStr);
    if (minCount > 1) return { type: 'RANGE_MIN', ids: ids, min: minCount, isTarget: isTarget };
    if (ids.length > 1) return { type: 'OR_EXACT', ids: ids, isTarget: isTarget };
    return { type: 'EXACT', id: ids[0], isTarget: isTarget };
  }).filter(Boolean);
}

function matchCondition_(cond, cart, services, excludeIds) {
  excludeIds = excludeIds || [];
  var cartIds = cart.map(function(i) { return i.serviceId; }).filter(function(id) { return excludeIds.indexOf(id) === -1; });

  if (cond.type === 'EXACT') {
    var met = cartIds.indexOf(cond.id) !== -1;
    return { met: met, matched: met ? [cond.id] : [] };
  }
  if (cond.type === 'OR_EXACT') {
    var matched = cond.ids.filter(function(id) { return cartIds.indexOf(id) !== -1; });
    return { met: matched.length >= 1, matched: matched };
  }
  if (cond.type === 'RANGE_MIN') {
    var matched = cond.ids.filter(function(id) { return cartIds.indexOf(id) !== -1; });
    return { met: matched.length >= cond.min, matched: matched };
  }
  if (cond.type === 'ANY_TQ01') {
    var matched = cart.filter(function(i) {
      if (excludeIds.indexOf(i.serviceId) !== -1) return false;
      var svc = services.find(function(s) { return s.MaDichVu === i.serviceId; });
      return svc && Number(svc.GiaSauKM) >= cond.minPrice;
    }).map(function(i) { return i.serviceId; });
    return { met: matched.length >= 1, matched: matched };
  }
  if (cond.type === 'TAG') {
    var matched = cart.filter(function(i) {
      if (excludeIds.indexOf(i.serviceId) !== -1) return false;
      var svc = services.find(function(s) { return s.MaDichVu === i.serviceId; });
      return svc && String(svc.Tag || '').split(',').map(function(t) { return t.trim(); }).indexOf(cond.tag) !== -1;
    }).map(function(i) { return i.serviceId; });
    return { met: matched.length >= cond.min, matched: matched };
  }
  return { met: false, matched: [] };
}

function matchCombo_(combo, cart, services) {
  var conditions = parseConditions_(combo.DieuKienApDung || '');
  if (conditions.length === 0) return null;

  var targetExcludeIds = [];
  conditions.filter(function(c) { return c.isTarget; }).forEach(function(cond) {
    if (cond.type === 'EXACT') {
      targetExcludeIds.push(cond.id);
    } else if (cond.ids) {
      cond.ids.filter(function(id) { return cart.find(function(i) { return i.serviceId === id; }); })
        .forEach(function(id) { targetExcludeIds.push(id); });
    }
  });

  var conditionResults = conditions.map(function(cond) {
    var exclude = cond.type === 'ANY_TQ01' ? targetExcludeIds : [];
    var res = matchCondition_(cond, cart, services, exclude);
    return Object.assign({}, cond, res);
  });

  var allMet = conditionResults.every(function(c) { return c.met; });
  var targetServices = conditionResults
    .filter(function(c) { return c.isTarget && c.met; })
    .reduce(function(acc, c) { return acc.concat(c.matched); }, []);

  return { combo: combo, allMet: allMet, conditionResults: conditionResults, targetServices: targetServices };
}

// Parse số tiền từ ô currency (trả về raw value hoặc parse text "1.000.000 ₫")
function parseCurrency_(val) {
  if (typeof val === 'number') return val;
  return Number(String(val).replace(/[^\d]/g, '')) || 0;
}

// Tính KM Sinh nhật theo đúng tier từ DM_LuatKM
function getKMSinhNhat_(rules, totalTQ, groupCount, specialType) {
  var active = rules.filter(function(r) {
    return String(r.MaLuatKM || '').indexOf('KMSN-') === 0
      && String(r.TrangThai || '') === 'Đang áp dụng';
  });
  var applied = [];

  // 1. Bill tier (KMSN-01~04): chọn mức cao nhất đủ điều kiện
  var billMas = ['KMSN-01','KMSN-02','KMSN-03','KMSN-04'];
  var billOk = active.filter(function(r) {
    return billMas.indexOf(String(r.MaLuatKM)) !== -1
      && parseCurrency_(r.BillToiThieu) <= totalTQ;
  }).sort(function(a, b) { return parseCurrency_(b.GiaTriGiam) - parseCurrency_(a.GiaTriGiam); });
  if (billOk.length) applied.push(billOk[0]);

  // 2. Nhóm (KMSN-05~06): chọn mức cao nhất đủ điều kiện
  var groupMas = ['KMSN-05','KMSN-06'];
  var groupOk = active.filter(function(r) {
    return groupMas.indexOf(String(r.MaLuatKM)) !== -1
      && Number(r.SoKhachToiThieu || 1) <= groupCount;
  }).sort(function(a, b) { return parseCurrency_(b.GiaTriGiam) - parseCurrency_(a.GiaTriGiam); });
  if (groupOk.length) applied.push(groupOk[0]);

  // 3. Đối tượng đặc biệt (KMSN-07/08): KMSN-08 ưu tiên nếu đủ nhóm
  var isStudent = specialType === 'HS/SV/GV' || specialType === 'Du học sinh';
  if (isStudent) {
    var r08 = active.find(function(r) { return r.MaLuatKM === 'KMSN-08'; });
    var r07 = active.find(function(r) { return r.MaLuatKM === 'KMSN-07'; });
    if (r08 && groupCount >= Number(r08.SoKhachToiThieu || 2)) {
      applied.push(r08);
    } else if (r07) {
      applied.push(r07);
    }
  }

  var total = applied.reduce(function(sum, r) { return sum + parseCurrency_(r.GiaTriGiam); }, 0);
  return { total: total, applied: applied };
}

// Lấy luật KM
function handleGetRules() {
  const rules = getSheetData(CONFIG.SHEETS.RULES);
  return makeSuccess({ rules });
}

// Lấy danh sách nhân viên
function handleGetStaff(branch) {
  let staff = getSheetData(CONFIG.SHEETS.STAFF);
  if (branch) {
    staff = staff.filter(s => String(s.CoSo).indexOf(branch) !== -1 || s.CoSo === 'Tất cả');
  }
  return makeSuccess({ staff });
}

// Tính toán báo giá
function handleCalculate(body) {
  const { items, branch, hasBirthday, groupCount, specialType } = body;
  if (!items || items.length === 0) return makeError("Chưa chọn dịch vụ", 400);
  
  const services = getSheetData(CONFIG.SHEETS.SERVICES);
  const combos = handleGetCombos().combos;
  const rules  = getSheetData(CONFIG.SHEETS.RULES);
  const lockedIds = rules
    .filter(r => String(r.MaLuatKM || '').indexOf('KMCB-LOCK-') === 0)
    .map(r => 'DV-' + String(r.MaLuatKM).replace('KMCB-LOCK-', ''));
  const cartIsLocked = items.some(i => lockedIds.indexOf(i.serviceId) !== -1);

  let totalNY = 0;
  let totalTQ = 0;
  const detailLines = [];
  const gifts = [];
  const warnings = [];
  
  items.forEach(item => {
    const svc = services.find(s => s.MaDichVu === item.serviceId);
    if (!svc) {
      warnings.push("Không tìm thấy dịch vụ: " + item.serviceId);
      return;
    }
    
    const qty = Number(item.quantity) || 1;
    const priceNY = Number(svc.GiaNiemYet) || 0;
    const priceTQ = Number(svc.GiaSauKM) || priceNY;
    
    const lineNY = priceNY * qty;
    const lineTQ = priceTQ * qty;
    
    totalNY += lineNY;
    totalTQ += lineTQ;
    
    if (svc.QuaTang) {
      gifts.push(svc.QuaTang);
    }
    
    detailLines.push({
      serviceId: item.serviceId,
      serviceName: svc.TenDichVu,
      quantity: qty,
      priceNY: priceNY,
      priceTQ: priceTQ,
      lineNY: lineNY,
      lineTQ: lineTQ,
      comboId: '',
      comboPrice: 0,
      snDiscount: 0,
      optimalPrice: lineTQ,
      gift: svc.QuaTang || ''
    });
  });
  
  // Áp dụng Khuyến mại Sinh nhật theo tier từ DM_LuatKM
  var kmSinhNhat = { total: 0, applied: [] };
  var totalSN = totalTQ;
  var snDiscountTotal = 0;
  if (hasBirthday && branch === 'OCP') {
    kmSinhNhat = getKMSinhNhat_(rules, totalTQ, groupCount || 1, specialType || '');
    snDiscountTotal = kmSinhNhat.total;
    totalSN = totalTQ - snDiscountTotal;
    // Phân bổ discount theo tỉ lệ cho từng line
    detailLines.forEach(function(line) {
      var ratio = totalTQ > 0 ? line.lineTQ / totalTQ : 0;
      line.snDiscount = Math.round(snDiscountTotal * ratio);
    });
  }
  
  // Áp dụng Combo (bỏ qua nếu giỏ hàng có DV bị khóa KMCB-LOCK)
  var activeCombs = combos.filter(function(c) { return c.TrangThai === 'Đang áp dụng'; });
  var cart = detailLines.map(function(d) { return { serviceId: d.serviceId, quantity: d.quantity }; });

  var bestComboTotal = totalTQ;
  var appliedComboId = '';
  var appliedComboName = '';
  var appliedComboResult = null;

  if (cartIsLocked) {
    warnings.push('Giỏ hàng có DV khóa cộng dồn — chỉ áp dụng CTKM thường quy TQ-01');
  }

  if (!cartIsLocked) activeCombs.forEach(function(cb) {
    var mr = matchCombo_(cb, cart, services);
    if (!mr || !mr.allMet) return;

    var comboTotal;
    if (cb.LoaiGia === 'GIA_TONG') {
      var outsideSum = detailLines.reduce(function(sum, line) {
        var inCombo = mr.conditionResults.some(function(c) {
          return c.type !== 'ANY_TQ01' && c.type !== 'TAG' && c.matched.indexOf(line.serviceId) !== -1;
        });
        return sum + (inCombo ? 0 : line.lineTQ);
      }, 0);
      comboTotal = Number(cb.GiaCombo) + outsideSum;
    } else if (cb.LoaiGia === 'GIA_ANCHOR') {
      var saving = mr.targetServices.reduce(function(sum, id) {
        var line = detailLines.find(function(l) { return l.serviceId === id; });
        return sum + (line ? line.lineTQ - Number(cb.GiaCombo) * line.quantity : 0);
      }, 0);
      comboTotal = totalTQ - saving;
    } else if (cb.LoaiGia === 'GIAM_PHAN_TRAM') {
      var saving = mr.targetServices.reduce(function(sum, id) {
        var line = detailLines.find(function(l) { return l.serviceId === id; });
        return sum + (line ? line.lineTQ * Number(cb.PhanTramGiam) : 0);
      }, 0);
      comboTotal = totalTQ - saving;
    } else {
      return;
    }

    if (comboTotal < bestComboTotal) {
      bestComboTotal = comboTotal;
      appliedComboId = cb.MaCombo;
      appliedComboName = cb.TenCombo;
      appliedComboResult = mr;
    }
  });

  if (appliedComboId && appliedComboResult) {
    var cb = combos.find(function(c) { return c.MaCombo === appliedComboId; });
    var mr = appliedComboResult;

    if (cb.LoaiGia === 'GIA_TONG') {
      var comboLineIds = mr.conditionResults
        .filter(function(c) { return c.type !== 'ANY_TQ01' && c.type !== 'TAG'; })
        .reduce(function(acc, c) { return acc.concat(c.matched); }, []);
      var totalComboNY = detailLines.reduce(function(sum, l) {
        return sum + (comboLineIds.indexOf(l.serviceId) !== -1 ? l.lineNY : 0);
      }, 0);
      detailLines.forEach(function(line) {
        if (comboLineIds.indexOf(line.serviceId) !== -1) {
          line.comboId = cb.MaCombo;
          var ratio = totalComboNY > 0 ? line.lineNY / totalComboNY : 0;
          line.comboPrice = Math.round(cb.GiaCombo * ratio / line.quantity);
          line.optimalPrice = line.comboPrice * line.quantity;
        }
      });
    } else if (cb.LoaiGia === 'GIA_ANCHOR') {
      mr.targetServices.forEach(function(id) {
        var line = detailLines.find(function(l) { return l.serviceId === id; });
        if (line) {
          line.comboId = cb.MaCombo;
          line.comboPrice = Number(cb.GiaCombo);
          line.optimalPrice = line.comboPrice * line.quantity;
        }
      });
    } else if (cb.LoaiGia === 'GIAM_PHAN_TRAM') {
      mr.targetServices.forEach(function(id) {
        var line = detailLines.find(function(l) { return l.serviceId === id; });
        if (line) {
          line.comboId = cb.MaCombo;
          line.comboPrice = Math.round(line.priceTQ * (1 - Number(cb.PhanTramGiam)));
          line.optimalPrice = line.comboPrice * line.quantity;
        }
      });
    }
  }
  
  if (hasBirthday && branch === 'OCP' && totalSN < bestComboTotal) {
    detailLines.forEach(line => {
      line.optimalPrice = line.lineTQ - line.snDiscount;
    });
  }
  
  const plans = [
    { id: "p1", label: "Chỉ áp dụng CTKM thường quy", total: totalTQ, promos: [], warnings: [] }
  ];
  
  if (hasBirthday && branch === 'OCP' && snDiscountTotal > 0) {
    var snPromos = kmSinhNhat.applied.map(function(r) {
      return r.MaLuatKM + ' – ' + r.TenChuongTrinh.replace(/KM Sinh nhật - /,'') + ': -' + parseCurrency_(r.GiaTriGiam).toLocaleString('vi-VN') + 'đ';
    });
    var snMas = kmSinhNhat.applied.map(function(r) { return r.MaLuatKM; }).join(' + ');
    plans.push({
      id: "p2",
      label: "Áp dụng KM Sinh nhật (" + snMas + ")",
      total: totalSN,
      promos: snPromos,
      warnings: []
    });
  }
  
  if (appliedComboId) {
    plans.push({
      id: "p3",
      label: "Áp dụng Combo: " + appliedComboName,
      total: bestComboTotal,
      promos: ["Combo " + appliedComboName],
      warnings: []
    });
  }
  
  plans.sort((a, b) => a.total - b.total);
  const bestPlan = plans[0];
  const tienGiam = totalNY - bestPlan.total;
  const tiLeGiam = totalNY > 0 ? (tienGiam / totalNY) : 0;
  const needsApproval = tiLeGiam > CONFIG.APPROVAL_THRESHOLD;
  
  // Gợi ý combo partial (frontend đã xử lý real-time, GAS chỉ bổ sung cho payload)
  var comboSuggestions = [];
  activeCombs.forEach(function(cb) {
    var mr = matchCombo_(cb, cart, services);
    if (mr && !mr.allMet && mr.conditionResults.some(function(c) { return c.met; })) {
      comboSuggestions.push({ combo: cb, partial: true });
    }
  });
  
  return makeSuccess({
    totalNY,
    totalTQ,
    totalSN: hasBirthday && branch === 'OCP' ? totalSN : null,
    bestComboTotal: appliedComboId ? bestComboTotal : null,
    tienGiam,
    tiLeGiam,
    bestPlan,
    allPlans: plans,
    detailLines,
    gifts,
    warnings,
    comboSuggestions,
    needsApproval,
    kmsnApplied: kmSinhNhat.applied.map(function(r) {
      return { ma: r.MaLuatKM, ten: String(r.TenChuongTrinh || ''), giam: parseCurrency_(r.GiaTriGiam) };
    })
  });
}

// Tạo mới báo giá
function handleCreateQuote(body) {
  const {
    customerName, phone, branch, staffId, staffName,
    consultDate, hasBirthday, groupCount, specialType, note,
    calcResult
  } = body;

  if (!customerName) return makeError('Thiếu tên khách hàng', 400);
  if (!calcResult)   return makeError('Thiếu kết quả tính giá', 400);

  const maBQ = generateId('BQ', CONFIG.SHEETS.BQ_HEADER, 'MaBaoGia');
  const needsApproval = calcResult.tiLeGiam > CONFIG.APPROVAL_THRESHOLD;

  const header = {
    MaBaoGia:         maBQ,
    NgayTuVan:        consultDate || today(),
    MaNhanVien:       staffId     || '',
    TenTuVanVien:     staffName   || '',
    CoSo:             branch,
    HoTenKhachHang:   customerName,
    SoDienThoai:      phone       || '',
    CoSinhNhat:       hasBirthday ? 'Có' : 'Không',
    SoKhachDiCung:    groupCount  || 1,
    DoiTuongDacBiet:  specialType || 'Không',
    GhiChuTuVan:      note        || '',
    TongGiaNiemYet:   calcResult.totalNY,
    TongGiaSauTQ:     calcResult.totalTQ,
    TongGiaSauSN:     calcResult.totalSN || '',
    TongGiaCombo:     calcResult.bestComboTotal || '',
    GiaToiUu:         calcResult.bestPlan.total,
    TienGiam:         calcResult.tienGiam,
    TiLeGiam:         calcResult.tiLeGiam,
    QuyenToiUu:       calcResult.bestPlan.label,
    QuaTangTong:      (calcResult.gifts || []).join(', '),
    CanhBao:          (calcResult.warnings || []).join('; '),
    TrangThaiBaoGia:  needsApproval ? 'Chờ duyệt' : 'Đã duyệt',
    DaDatCoc:         'Chưa',
    SoTienCoc:        0,
    NgayHetHanBaoGia: addDays(CONFIG.QUOTE_VALIDITY_DAYS),
    NguoiDuyetBaoGia: needsApproval ? '' : 'Tự duyệt',
    GhiChuDuyet:      '',
  };
  const writeRes = appendRow(CONFIG.SHEETS.BQ_HEADER, header);

  const details = (calcResult.detailLines || []);
  details.forEach((line, idx) => {
    const detailRow = {
      MaChiTiet:       `CT-${maBQ}-${String(idx + 1).padStart(2, '0')}`,
      MaBaoGia:        maBQ,
      MaDichVu:        line.serviceId,
      TenDichVu:       line.serviceName,
      SoLuong:         line.quantity,
      GiaNiemYet_DV:   line.priceNY,
      GiaSauTQ_DV:     line.priceTQ,
      ThanhTienNY:     line.lineNY,
      ThanhTienTQ:     line.lineTQ,
      ComboApDung:     line.comboId    || '',
      GiaCombo_DV:     line.comboPrice || '',
      ThanhTienCombo:  line.comboPrice ? line.comboPrice * line.quantity : '',
      KMSinhNhat_DV:   line.snDiscount || 0,
      ThanhTienSN:     line.snDiscount ? line.lineTQ - line.snDiscount : '',
      GiaToiUu_DV:     line.optimalPrice || line.lineTQ,
      QuaTang:         line.gift || '',
      GhiChu:          '',
    };
    appendRow(CONFIG.SHEETS.BQ_DETAIL, detailRow);
  });

  return makeSuccess({
    maBaoGia:     maBQ,
    trangThai:    header.TrangThaiBaoGia,
    needsApproval,
    quote:        header,
    row:          writeRes.rowNum
  });
}

// Duyệt báo giá
function handleApproveQuote(body) {
  const { maBaoGia, approver, decision, note } = body;
  if (!maBaoGia) return makeError("Thiếu mã báo giá", 400);
  
  const status = decision === 'approve' ? 'Đã duyệt' : 'Từ chối';
  
  const updated = updateRow(CONFIG.SHEETS.BQ_HEADER, "MaBaoGia", maBaoGia, {
    TrangThaiBaoGia: status,
    NguoiDuyetBaoGia: approver || "Quản lý",
    GhiChuDuyet: note || ""
  });
  
  if (updated) {
    return makeSuccess({ message: decision === 'approve' ? "Duyệt báo giá thành công" : "Từ chối báo giá thành công" });
  } else {
    return makeError("Không tìm thấy báo giá cần xử lý", 404);
  }
}

// Ghi nhận đặt cọc
function handleDepositQuote(body) {
  const { maBaoGia, amount } = body;
  if (!maBaoGia) return makeError("Thiếu mã báo giá", 400);
  
  const updated = updateRow(CONFIG.SHEETS.BQ_HEADER, "MaBaoGia", maBaoGia, {
    DaDatCoc: "Đã cọc",
    SoTienCoc: Number(amount) || 0,
    TrangThaiBaoGia: "Đã chốt"
  });
  
  if (updated) {
    return makeSuccess({ message: "Ghi nhận đặt cọc thành công" });
  } else {
    return makeError("Không tìm thấy báo giá để ghi nhận đặt cọc", 404);
  }
}

// Lấy danh sách báo giá
function handleGetQuotes(params) {
  const quotes = getSheetData(CONFIG.SHEETS.BQ_HEADER);
  quotes.sort((a, b) => String(b.MaBaoGia).localeCompare(String(a.MaBaoGia)));
  return makeSuccess({ quotes });
}

// Lấy chi tiết báo giá
function handleGetQuote(id) {
  const quotes = getSheetData(CONFIG.SHEETS.BQ_HEADER);
  const quote = quotes.find(q => String(q.MaBaoGia) === String(id));
  if (!quote) return makeError("Không tìm thấy báo giá: " + id, 404);
  
  const allDetails = getSheetData(CONFIG.SHEETS.BQ_DETAIL);
  const details = allDetails.filter(d => String(d.MaBaoGia) === String(id));
  
  return makeSuccess({ quote, details });
}

// Lấy thông tin Dashboard
function handleGetDashboard(branch) {
  const quotes = getSheetData(CONFIG.SHEETS.BQ_HEADER);
  const services = getSheetData(CONFIG.SHEETS.SERVICES);
  
  const filtered = branch ? quotes.filter(q => q.CoSo === branch) : quotes;
  
  let totalQuotes = filtered.length;
  let totalNY = 0;
  let totalToiUu = 0;
  let chotCount = 0;
  let waitCount = 0;
  
  filtered.forEach(q => {
    totalNY += Number(q.TongGiaNiemYet) || 0;
    totalToiUu += Number(q.GiaToiUu) || 0;
    if (q.TrangThaiBaoGia === 'Đã chốt') chotCount++;
    if (q.TrangThaiBaoGia === 'Chờ duyệt') waitCount++;
  });
  
  const totalGiam = totalNY - totalToiUu;
  const avgDiscount = totalNY > 0 ? totalGiam / totalNY : 0;
  const conversionRate = totalQuotes > 0 ? chotCount / totalQuotes : 0;
  
  let missingPrice = services.filter(s => !s.GiaNiemYet || Number(s.GiaNiemYet) <= 0).length;
  let needVerify = 0;
  let pendingApproval = waitCount;
  
  const recentQuotes = [...filtered]
    .sort((a, b) => String(b.MaBaoGia).localeCompare(String(a.MaBaoGia)))
    .slice(0, 10);
    
  return makeSuccess({
    kpis: {
      totalQuotes,
      totalNY,
      totalToiUu,
      avgDiscount,
      chotCount,
      waitCount,
      conversionRate,
      totalGiam
    },
    warnings: {
      missingPrice,
      needVerify,
      pendingApproval
    },
    recentQuotes
  });
}

// ==========================================
// 4. CÁC HÀM TIỆN ÍCH PHỤ TRỢ (HELPERS)
// ==========================================

function makeSuccess(data) {
  return { success: true, ...data };
}

function makeError(error, code) {
  return { success: false, error: error, code: code || 500 };
}

function today() {
  return Utilities.formatDate(new Date(), "GMT+7", "yyyy-MM-dd");
}

function addDays(days) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return Utilities.formatDate(date, "GMT+7", "yyyy-MM-dd");
}

function generateId(prefix, sheetName, idColName) {
  const sh = getSheet(sheetName);
  const headerInfo = getHeaderRowInfo(sh);
  const headers = headerInfo.headers;
  const colIdx = headers.indexOf(idColName);
  if (colIdx === -1) throw new Error("Không tìm thấy cột ID: " + idColName);
  
  const lastRow = sh.getLastRow();
  if (lastRow <= headerInfo.index) {
    return prefix + "0001";
  }
  
  const values = sh.getRange(headerInfo.index + 1, colIdx + 1, lastRow - headerInfo.index, 1).getValues();
  let maxNum = 0;
  values.forEach(row => {
    const val = String(row[0]);
    if (val.startsWith(prefix)) {
      const num = parseInt(val.substring(prefix.length), 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  });
  
  return prefix + String(maxNum + 1).padStart(4, '0');
}
