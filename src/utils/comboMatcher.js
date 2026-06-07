// ── Expand "DV-046~051" hoặc "DV-046~048,DV-058~060" thành mảng ID ──────────
function expandSet(setStr) {
  const ids = []
  setStr.split(',').forEach(raw => {
    const part = raw.trim()
    if (!part) return
    if (part.includes('~')) {
      const [from, to] = part.split('~').map(s => s.trim())
      const m = from.match(/^([A-Za-z-]+)(\d+)$/)
      if (!m) return
      const prefix = m[1]
      const padLen = m[2].length
      const fromN = parseInt(m[2])
      const toN   = parseInt(to.replace(prefix, ''))
      for (let i = fromN; i <= toN; i++) {
        ids.push(prefix + String(i).padStart(padLen, '0'))
      }
    } else {
      ids.push(part)
    }
  })
  return ids
}

// ── Parse chuỗi DieuKienApDung thành mảng điều kiện ─────────────────────────
export function parseConditions(str) {
  if (!str || str.includes('[pending]')) return []
  return str.split('+').map(raw => {
    let token = raw.trim()
    const isTarget = token.includes('*')
    token = token.replace('*', '').trim()

    if (token.startsWith('TQ01>=')) {
      return { type: 'ANY_TQ01', minPrice: Number(token.replace('TQ01>=', '')), isTarget }
    }
    if (token.startsWith('TAG:')) {
      const rest = token.replace('TAG:', '')
      if (rest.includes('>=')) {
        const [tag, min] = rest.split('>=')
        return { type: 'TAG', tag: tag.trim(), min: Number(min) || 1, isTarget }
      }
      return { type: 'TAG', tag: rest.trim(), min: 1, isTarget }
    }

    let setStr = token, minCount = 1
    if (token.includes('>=')) {
      const idx = token.lastIndexOf('>=')
      setStr    = token.substring(0, idx)
      minCount  = Number(token.substring(idx + 2)) || 1
    }
    const ids = expandSet(setStr)
    if (minCount > 1) return { type: 'RANGE_MIN', ids, min: minCount, isTarget }
    if (ids.length > 1) return { type: 'OR_EXACT', ids, isTarget }
    return { type: 'EXACT', id: ids[0], isTarget }
  }).filter(Boolean)
}

// ── Kiểm tra một điều kiện với giỏ hàng hiện tại ────────────────────────────
function matchCondition(cond, cart, services, excludeIds = []) {
  const cartIds = cart.map(i => i.serviceId).filter(id => !excludeIds.includes(id))

  switch (cond.type) {
    case 'EXACT': {
      const met = cartIds.includes(cond.id)
      return { met, matched: met ? [cond.id] : [], missing: met ? [] : [cond.id] }
    }
    case 'OR_EXACT': {
      const matched = cond.ids.filter(id => cartIds.includes(id))
      return { met: matched.length >= 1, matched, missing: cond.ids.filter(id => !cartIds.includes(id)) }
    }
    case 'RANGE_MIN': {
      const matched = cond.ids.filter(id => cartIds.includes(id))
      return { met: matched.length >= cond.min, matched, missing: cond.ids.filter(id => !cartIds.includes(id)) }
    }
    case 'ANY_TQ01': {
      const matched = cart
        .filter(i => {
          if (excludeIds.includes(i.serviceId)) return false
          const svc = services.find(s => s.MaDichVu === i.serviceId)
          return svc &&
            String(svc.NhomKM || '') === 'TQ-01' &&
            String(svc.ApDungDongThoi_TQ || '') === 'Có' &&
            Number(svc.GiaSauKM) >= cond.minPrice
        })
        .map(i => i.serviceId)
      return { met: matched.length >= 1, matched, missing: [] }
    }
    case 'TAG': {
      const matched = cart
        .filter(i => {
          if (excludeIds.includes(i.serviceId)) return false
          const svc = services.find(s => s.MaDichVu === i.serviceId)
          return svc && String(svc.Tag || '').split(',').map(t => t.trim()).includes(cond.tag)
        })
        .map(i => i.serviceId)
      return { met: matched.length >= cond.min, matched, missing: [] }
    }
    default:
      return { met: false, matched: [], missing: [] }
  }
}

// ── Kiểm tra toàn bộ combo với giỏ hàng ─────────────────────────────────────
export function matchCombo(combo, cart, services) {
  const conditions = parseConditions(combo.DieuKienApDung || '')
  if (conditions.length === 0) return null

  // Xác định target IDs để loại khỏi điều kiện ANY_TQ01
  const targetExcludeIds = []
  conditions.filter(c => c.isTarget).forEach(cond => {
    if (cond.type === 'EXACT') targetExcludeIds.push(cond.id)
    else if (cond.ids) {
      cond.ids.filter(id => cart.find(i => i.serviceId === id)).forEach(id => targetExcludeIds.push(id))
    }
  })

  const conditionResults = conditions.map(cond => {
    const exclude = cond.type === 'ANY_TQ01' ? targetExcludeIds : []
    return { ...cond, ...matchCondition(cond, cart, services, exclude) }
  })

  const allMet       = conditionResults.every(c => c.met)
  const matchedCount = conditionResults.filter(c => c.met).length
  const targetServices = conditionResults
    .filter(c => c.isTarget && c.met)
    .flatMap(c => c.matched)

  return { combo, allMet, partial: matchedCount > 0 && !allMet, matchedCount, totalConditions: conditions.length, conditionResults, targetServices }
}

// ── Tính giá preview khi combo đã match đủ ───────────────────────────────────
export function calcComboPreview(matchResult, cart, services) {
  if (!matchResult?.allMet) return null
  const { combo, conditionResults, targetServices } = matchResult

  const getSvcPrice = (serviceId) => {
    const svc = services.find(s => s.MaDichVu === serviceId)
    return Number(svc?.GiaSauKM) || 0
  }

  // Tập hợp tất cả DV thuộc các điều kiện của combo (không kể ANY_TQ01/TAG)
  const comboServiceIds = conditionResults
    .filter(c => c.type !== 'ANY_TQ01' && c.type !== 'TAG')
    .flatMap(c => c.matched)

  const comboServicesTQ = comboServiceIds.reduce((sum, id) => {
    const item = cart.find(i => i.serviceId === id)
    return sum + getSvcPrice(id) * (item?.quantity || 1)
  }, 0)

  if (combo.LoaiGia === 'GIA_TONG') {
    const total  = Number(combo.GiaCombo)
    return { total, saving: Math.max(0, comboServicesTQ - total) }
  }

  if (combo.LoaiGia === 'GIA_ANCHOR') {
    const anchorId    = targetServices[0]
    const anchorItem  = cart.find(i => i.serviceId === anchorId)
    const anchorQty   = anchorItem?.quantity || 1
    const anchorOldP  = getSvcPrice(anchorId) * anchorQty
    const anchorNewP  = Number(combo.GiaCombo)
    return { total: anchorNewP, saving: Math.max(0, anchorOldP - anchorNewP), label: 'Giá DV chính' }
  }

  if (combo.LoaiGia === 'GIAM_PHAN_TRAM') {
    const rate    = Number(combo.PhanTramGiam) || 0
    const saving  = targetServices.reduce((sum, id) => {
      const item = cart.find(i => i.serviceId === id)
      return sum + getSvcPrice(id) * (item?.quantity || 1) * rate
    }, 0)
    return { saving: Math.round(saving), pct: Math.round(rate * 100) }
  }

  return null
}

// ── Label hiển thị cho một điều kiện ─────────────────────────────────────────
export function conditionLabel(cond, services) {
  const name = id => {
    const svc = services.find(s => s.MaDichVu === id)
    return svc ? svc.TenDichVu : id
  }
  switch (cond.type) {
    case 'EXACT':      return name(cond.id)
    case 'OR_EXACT':   return cond.ids.length <= 2 ? cond.ids.map(name).join(' / ') : `1 trong ${cond.ids.length} DV`
    case 'RANGE_MIN':  return `≥${cond.min} DV (${cond.ids.length} lựa chọn)`
    case 'ANY_TQ01':   return `1 DV lẻ ≥${(cond.minPrice / 1e6).toFixed(0)}tr`
    case 'TAG':        return `≥${cond.min} DV nhóm ${cond.tag}`
    default:           return '?'
  }
}
