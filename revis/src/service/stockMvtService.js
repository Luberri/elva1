import { get, post, put, del, xmlToJson, jsonToXml, toText } from '../api/util.js'
import { getStockDetail, updateStock } from './stockService.js'

async function applyMovementToPhysicalStock(data) {
  const id_stock = data?.id_stock
  const qty = Number(data?.physical_quantity || 0)
  const sign = Number(data?.sign || 0)

  if (!id_stock) return
  if (!Number.isFinite(qty) || qty === 0) return
  if (sign !== 1 && sign !== -1) return

  const stock = await getStockDetail(id_stock)
  if (!stock) return

  const currentPhysical = Number(stock.physical_quantity || 0)
  const currentUsable = Number(stock.usable_quantity || 0)

  let nextPhysical = currentPhysical + sign * qty
  let nextUsable = currentUsable + sign * qty

  if (!Number.isFinite(nextPhysical)) nextPhysical = currentPhysical
  if (!Number.isFinite(nextUsable)) nextUsable = currentUsable

  if (nextPhysical < 0) nextPhysical = 0
  if (nextUsable < 0) nextUsable = 0

  await updateStock(id_stock, {
    id_warehouse: stock.id_warehouse || 1,
    id_product: stock.id_product,
    id_product_attribute: stock.id_product_attribute || 0,
    physical_quantity: nextPhysical,
    usable_quantity: nextUsable,
    price_te: stock.price_te ?? 0
  })
}

function buildListQuery({ filters = {}, sort, limit, display = 'full' } = {}) {
  const query = { display }
  for (const [key, value] of Object.entries(filters)) {
    if (value === undefined || value === null || value === '') continue
    query[`filter[${key}]`] = value
  }
  if (sort) query.sort = sort
  if (limit) query.limit = limit
  return query
}

export async function apiStockMvtList(options = {}) {
  const xml = await get({ resource: 'stock_movements', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function getAllStockMvts(options = {}) {
  const data = await apiStockMvtList(options)
  const nodes = data?.prestashop?.stock_mvts?.stock_mvt || data?.prestashop?.stock_mvt
  if (!nodes) return []
  const list = Array.isArray(nodes) ? nodes : [nodes]
  return list.map(formatStockMvtData).filter(Boolean)
}

// ===============================
// FORMAT
// ===============================
export function formatStockMvtData(mvt) {
  if (!mvt) return null
  return {
    id: toText(mvt.id),
    id_product: toText(mvt.id_product),
    id_product_attribute: toText(mvt.id_product_attribute),
    id_warehouse: toText(mvt.id_warehouse),
    id_currency: toText(mvt.id_currency),
    management_type: toText(mvt.management_type),
    id_employee: toText(mvt.id_employee),
    id_stock: toText(mvt.id_stock),
    id_stock_mvt_reason: toText(mvt.id_stock_mvt_reason),
    id_order: toText(mvt.id_order),
    id_supply_order: toText(mvt.id_supply_order),
    product_name: mvt.product_name,
    ean13: toText(mvt.ean13),
    upc: toText(mvt.upc),
    reference: toText(mvt.reference),
    mpn: toText(mvt.mpn),
    physical_quantity: toText(mvt.physical_quantity),
    sign: toText(mvt.sign),
    last_wa: toText(mvt.last_wa),
    current_wa: toText(mvt.current_wa),
    price_te: toText(mvt.price_te),
    date_add: toText(mvt.date_add)
  }
}

// ===============================
// GET ONE
// ===============================
export async function apiStockMvt(id) {
  if (!id) throw new Error('ID stock_mvt manquant')
  const xml = await get({ resource: 'stock_movements', id })
  return xmlToJson(xml)
}

// ===============================
// GET DETAIL
// ===============================
export async function getStockMvtDetail(id) {
  const data = await apiStockMvt(id)
  return formatStockMvtData(data?.prestashop?.stock_mvt)
}

export async function updateStockMvtDate(id, dateAdd) {
  if (!id) throw new Error('ID stock_mvt manquant')
  if (!dateAdd) throw new Error('date_add manquant')

  let xml = await get({ resource: 'stock_movements', id })
  if (xml === undefined || xml === null) throw new Error('Stock movement introuvable')
  xml = String(xml)

  const cdata = `<![CDATA[${dateAdd}]]>`

  if (/<date_add>[\s\S]*?<\/date_add>/.test(xml)) {
    xml = xml.replace(/<date_add>[\s\S]*?<\/date_add>/, `<date_add>${cdata}</date_add>`)
  } else {
    xml = xml.replace(/<\/stock_movement>/, `  <date_add>${cdata}</date_add>\n  </stock_movement>`)
  }

  if (/^\s*<prestashop(?![^>]*xmlns:xlink)/m.test(xml)) {
    xml = xml.replace(/<prestashop(\s*)/m, `<prestashop xmlns:xlink="http://www.w3.org/1999/xlink"$1`)
  }

  const xmlResponse = await put({ resource: 'stock_movements', id, body: xml })
  return xmlToJson(xmlResponse)
}

// ===============================
// CREATE
// ===============================
export async function createStockMvt(data) {
  // data: { id_product, id_employee, id_stock, price_te, id_product_attribute, id_stock_mvt_reason, physical_quantity, date_add, sign }
  console.log('stock movement with data:......')
  const mvtObj = {
    id_product: data.id_product,
    id_employee: data.id_employee,
    id_stock: data.id_stock,
    price_te: data.price_te,
    id_product_attribute: data.id_product_attribute,
    id_stock_mvt_reason: data.id_stock_mvt_reason,
    physical_quantity: data.physical_quantity,
    date_add: data.date_add,
    sign: data.sign
  }

  // Ajouter les attributs produit optionnels si fournis
  if (data.product_name) mvtObj.product_name = data.product_name
  if (data.ean13) mvtObj.ean13 = data.ean13
  if (data.upc) mvtObj.upc = data.upc
  if (data.reference) mvtObj.reference = data.reference
  if (data.mpn) mvtObj.mpn = data.mpn

  if (data.id_warehouse) mvtObj.id_warehouse = data.id_warehouse
  if (data.id_currency) mvtObj.id_currency = data.id_currency
  if (data.management_type) mvtObj.management_type = data.management_type
  if (data.id_order) mvtObj.id_order = data.id_order
  if (data.id_supply_order) mvtObj.id_supply_order = data.id_supply_order
  if (data.last_wa) mvtObj.last_wa = data.last_wa
  if (data.current_wa) mvtObj.current_wa = data.current_wa

  const xmlRequest = jsonToXml({
    prestashop: {
      stock_movement: mvtObj
    }
  })

  const xmlResponse = await post({
    resource: 'stock_movements',
    body: xmlRequest
  })
  console.log('stock movement response:......', xmlResponse)
  const response = xmlToJson(xmlResponse)

  // Mettre à jour le stock physique (stocks) selon le mouvement
  // IMPORTANT: certains appels (ex: après createStock) doivent éviter ce calcul pour ne pas doubler.
  if (!data?.skipStockUpdate) {
    try {
      await applyMovementToPhysicalStock(data)
    } catch (e) {
      console.error('Erreur update stock physique après mouvement:', e?.message || e)
    }
  }

  return response
}
