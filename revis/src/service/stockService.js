import { get, post, put, del, xmlToJson, jsonToXml, toText } from '../api/util.js'
import { createStockMvt } from './stockMvtService.js'

const DEFAULT_WAREHOUSE_ID = 1

function pad(n) { return n < 10 ? '0' + n : String(n) }
function formatDateTime(d) {
  const Y = d.getFullYear()
  const M = pad(d.getMonth() + 1)
  const D = pad(d.getDate())
  const h = pad(d.getHours())
  const m = pad(d.getMinutes())
  const s = pad(d.getSeconds())
  return `${Y}-${M}-${D} ${h}:${m}:${s}`
}

// ===============================
// FORMAT
// ===============================
export function formatStockData(stock) {
  if (!stock) return null

  return {
    id: String(stock.id || ''),
    id_warehouse: toText(stock.id_warehouse),
    id_product: toText(stock.id_product),
    id_product_attribute: toText(stock.id_product_attribute),

    physical_quantity: toText(stock.physical_quantity),
    usable_quantity: toText(stock.usable_quantity),

    price_te: toText(stock.price_te)
  }
}

// ===============================
// QUERY
// ===============================
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

// ===============================
// GET ONE
// ===============================
export async function apiStock(id) {
  if (!id) throw new Error('ID stock manquant')

  const xml = await get({ resource: 'stocks', id })
  return xmlToJson(xml)
}

// ===============================
// GET ALL
// ===============================
export async function apiStocks(options = {}) {
  const xml = await get({
    resource: 'stocks',
    query: buildListQuery(options)
  })

  return xmlToJson(xml)
}

// ===============================
// GET DETAIL
// ===============================
export async function getStockDetail(id) {
  const data = await apiStock(id)
  return formatStockData(data?.prestashop?.stock)
}

// ===============================
// LIST
// ===============================
export async function getAllStocks(options = {}) {
  const data = await apiStocks(options)
  const nodes = data?.prestashop?.stocks?.stock

  if (!nodes) return []

  const list = Array.isArray(nodes) ? nodes : [nodes]
  return list.map(formatStockData).filter(Boolean)
}

// ===============================
// DELETE
// ===============================
export async function deleteStock(id) {
  if (!id) throw new Error('ID stock manquant')

  const xml = await del({
    resource: 'stocks',
    id
  })

  return xmlToJson(xml)
}

// ===============================
// CREATE (FIX IMPORTANT)
// ===============================
export async function createStock(data) {
  if (!data.id_product) throw new Error('id_product manquant')

  const stockObj = {
    id_warehouse: data.id_warehouse ?? DEFAULT_WAREHOUSE_ID,
    id_product: data.id_product,
    id_product_attribute: data.id_product_attribute ?? 0,

    physical_quantity: data.physical_quantity ?? 0,
    usable_quantity: data.usable_quantity ?? data.physical_quantity ?? 0,

    price_te: data.price_te ?? 0
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      stock: stockObj
    }
  })

  console.log("STOCK CREATE XML =>", xmlRequest)

  const xmlResponse = await post({
    resource: 'stocks',
    body: xmlRequest
  })

  const response = xmlToJson(xmlResponse)

  // Après création du stock physique, créer un mouvement de stock (entrée)
  try {
    const createdStockId = response?.prestashop?.stock?.id
    const mvtPayload = {
      id_product: data.id_product,
      id_employee: data.id_employee ?? 1,
      id_stock: createdStockId,
      price_te: data.price_te ?? 0,
      id_product_attribute: data.id_product_attribute ?? 0,
      id_stock_mvt_reason: data.id_stock_mvt_reason ?? 1,
      physical_quantity: data.physical_quantity ?? 0,
      date_add: formatDateTime(new Date()),
      sign: 1
    }

    // Ajouter attributs produit si fournis
    if (data.product_name) mvtPayload.product_name = data.product_name
    if (data.reference) mvtPayload.reference = data.reference
    if (data.ean13) mvtPayload.ean13 = data.ean13
    if (data.upc) mvtPayload.upc = data.upc
    if (data.mpn) mvtPayload.mpn = data.mpn
    if (data.id_warehouse) mvtPayload.id_warehouse = data.id_warehouse

    await createStockMvt(mvtPayload)
  } catch (e) {
    // Ne pas empêcher la création du stock si la création du mouvement échoue
    console.error('Erreur création stock_mvt après stock:', e?.message || e)
  }

  return response
}

// ===============================
// UPDATE (FIX SAME RULES)
// ===============================
export async function updateStock(id, data) {
  if (!id) throw new Error('ID stock manquant')

  const stockObj = {
    id,
    id_warehouse: data.id_warehouse ?? DEFAULT_WAREHOUSE_ID,
    id_product: data.id_product,
    id_product_attribute: data.id_product_attribute ?? 0,

    physical_quantity: data.physical_quantity ?? 0,
    usable_quantity: data.usable_quantity ?? data.physical_quantity ?? 0,

    price_te: data.price_te ?? 0
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      stock: stockObj
    }
  })

  console.log("STOCK UPDATE XML =>", xmlRequest)

  const xmlResponse = await put({
    resource: 'stocks',
    id,
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}