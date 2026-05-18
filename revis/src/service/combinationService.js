import { get, post, put, del, xmlToJson, jsonToXml } from '../api/util.js'
import { toText } from '../api/util.js'
import { createStockAv } from './stockAvailableService.js'

// ================================
// FORMAT
// ================================
export function formatCombinationData(combination) {
  if (!combination) return null

  return {
    id: String(combination.id || ''),
    id_product: toText(combination.id_product),
    location: toText(combination.location),
    ean13: toText(combination.ean13),
    isbn: toText(combination.isbn),
    upc: toText(combination.upc),
    mpn: toText(combination.mpn),

    reference: toText(combination.reference),
    supplier_reference: toText(combination.supplier_reference),
    wholesale_price: toText(combination.wholesale_price),
    price: toText(combination.price),
    ecotax: toText(combination.ecotax),
    weight: toText(combination.weight),
    unit_price_impact: toText(combination.unit_price_impact),

    minimal_quantity: toText(combination.minimal_quantity),
    low_stock_threshold: toText(combination.low_stock_threshold),
    low_stock_alert: toText(combination.low_stock_alert) === '1',

    default_on: toText(combination.default_on) === '1',
    available_date: toText(combination.available_date),

    associations: combination.associations || null
  }
}

// ================================
// CLEAN XML
// ================================
function stripXlinkAttributes(value) {
  if (Array.isArray(value)) return value.map(stripXlinkAttributes)

  if (value && typeof value === 'object') {
    const cleaned = {}
    for (const [key, val] of Object.entries(value)) {
      if (key === 'xlink:href' || key === '@xlink:href') continue
      cleaned[key] = stripXlinkAttributes(val)
    }
    return cleaned
  }
  return value
}

// ================================
// LIST
// ================================
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

// ================================
// GET ONE
// ================================
export async function apiCombination(id) {
  if (!id) throw new Error('ID combinaison manquant')

  const xml = await get({ resource: 'combinations', id })
  return xmlToJson(xml)
}

// ================================
// GET ALL
// ================================
export async function apiCombinations(options = {}) {
  const xml = await get({
    resource: 'combinations',
    query: buildListQuery(options)
  })

  return xmlToJson(xml)
}

// ================================
// BY PRODUCT
// ================================
export async function apiCombinationsByProduct(productId) {
  if (!productId) {
    throw new Error('ID produit manquant')
  }

  const xml = await get({
    resource: 'combinations',
    query: {
      'filter[id_product]': productId,
      display: 'full'
    }
  })

  return xmlToJson(xml)
}

// ================================
// GET HELPERS
// ================================
export async function getCombination(id) {
  try {
    const data = await apiCombination(id)
    return formatCombinationData(data?.prestashop?.combination)
  } catch {
    return null
  }
}

export async function getAllCombinations(options = {}) {
  const data = await apiCombinations(options)
  const nodes = data?.prestashop?.combinations?.combination

  if (!nodes) return []

  const list = Array.isArray(nodes) ? nodes : [nodes]
  return list.map(formatCombinationData).filter(Boolean)
}

export async function getCombinationsByProduct(productId) {
  const data = await apiCombinationsByProduct(productId)
  const nodes = data?.prestashop?.combinations?.combination

  if (!nodes) return []

  const list = Array.isArray(nodes) ? nodes : [nodes]
  return list.map(formatCombinationData).filter(Boolean)
}

// ================================
// CREATE (FIX IMPORTANT)
// ================================
export async function createCombination(data) {
  if (!data.id_product) throw new Error('id_product requis')
  if (!data.product_option_value_ids?.length) {
    throw new Error('product_option_value_ids requis')
  }

  const obj = {
    id_product: data.id_product,
    minimal_quantity: data.minimal_quantity ?? 1,

    reference: data.reference || '',
    supplier_reference: data.supplier_reference || '',
    wholesale_price: data.wholesale_price ?? 0,
    price: data.price ?? 0,
    weight: data.weight ?? 0,
    ecotax: data.ecotax ?? 0,

    default_on: data.default_on ? 1 : 0,
    low_stock_alert: data.low_stock_alert ? 1 : 0,
    low_stock_threshold: data.low_stock_threshold ?? 0,

    available_date: data.available_date
  }

  // associations
  obj.associations = {
    product_option_values: {
      product_option_value: data.product_option_value_ids.map(id => ({
        id: String(id)
      }))
    }
  }

  const xmlRequest = jsonToXml({
    prestashop: { combination: obj }
  })

  const xmlResponse = await post({
    resource: 'combinations',
    body: xmlRequest
  })

  const res = xmlToJson(xmlResponse)
  const combId = res?.prestashop?.combination?.id

  // ================================
  // STOCK CREATION FIXED
  // ================================
  if (combId) {
    await createStockAv({
      id_product: data.id_product,
      id_product_attribute: combId,
      physical_quantity: data.quantity ?? 0,
      usable_quantity: data.quantity ?? 0,
      price_te: data.price ?? 0,
      reference: data.reference || ''
    })
  }

  return res
}

// ================================
// UPDATE (FIX SAME PROBLEMS)
// ================================
export async function updateCombination(id, data) {
  if (!id) throw new Error('ID combinaison manquant')

  const obj = {
    id,
    id_product: data.id_product,
    minimal_quantity: data.minimal_quantity ?? 1,

    reference: data.reference,
    supplier_reference: data.supplier_reference,
    wholesale_price: data.wholesale_price,
    price: data.price,
    weight: data.weight,
    ecotax: data.ecotax,

    default_on: data.default_on ? 1 : 0,
    low_stock_alert: data.low_stock_alert ? 1 : 0,
    low_stock_threshold: data.low_stock_threshold
  }

  if (data.associations) {
    obj.associations = stripXlinkAttributes(data.associations)
  }

  const xmlRequest = jsonToXml({
    prestashop: { combination: obj }
  })

  const xmlResponse = await put({
    resource: 'combinations',
    id,
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

// ================================
// DELETE
// ================================
export async function deleteCombination(id) {
  if (!id) throw new Error('ID combinaison manquant')

  const xml = await del({
    resource: 'combinations',
    id
  })

  return xmlToJson(xml)
}