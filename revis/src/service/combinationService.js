import { get, post, put, del, xmlToJson, jsonToXml } from '../api/util.js'
import { toText } from '../api/util.js'

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
    quantity: toText(combination.quantity),
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

function stripXlinkAttributes(value) {
  if (Array.isArray(value)) {
    return value.map(stripXlinkAttributes)
  }
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

export async function apiCombination(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID combinaison manquant')
  const xml = await get({ resource: 'combinations', id })
  return xmlToJson(xml)
}

export async function apiCombinations(options = {}) {
  const xml = await get({ resource: 'combinations', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function apiCombinationsByProduct(productId) {
  if (productId === undefined || productId === null || productId === '') {
    throw new Error('ID produit manquant pour les combinaisons')
  }
  const xml = await get({
    resource: 'combinations',
    query: { 'filter[id_product]': productId, display: 'full' }
  })
  return xmlToJson(xml)
}

export async function getCombination(combId) {
  const id = toText(combId)
  if (!id) return null

  try {
    const data = await apiCombination(id)
    const combination = data?.prestashop?.combination ?? null
    return formatCombinationData(combination)
  } catch {
    return null
  }
}

export async function getAllCombinations(options = {}) {
  const data = await apiCombinations(options)
  const nodes = data?.prestashop?.combinations?.combination
  
  if (!nodes) {
    return []
  }

  const list = Array.isArray(nodes) ? nodes : [nodes]
  return list.map(item => formatCombinationData(item)).filter(r => r !== null)
}

export async function getCombinationsByProduct(productId) {
  const data = await apiCombinationsByProduct(productId)
  const nodes = data?.prestashop?.combinations?.combination

  if (!nodes) {
    return []
  }

  const list = Array.isArray(nodes) ? nodes : [nodes]
  return list
    .map(item => formatCombinationData(item))
    .filter(r => r !== null)
}

export async function createCombination(data) {
  const obj = {
    id_product: data.id_product, // Obligatoire
    minimal_quantity: data.minimal_quantity || 1 // Obligatoire
  }

  // Optionnels
  if (data.location !== undefined) obj.location = data.location
  if (data.ean13 !== undefined) obj.ean13 = data.ean13
  if (data.isbn !== undefined) obj.isbn = data.isbn
  if (data.upc !== undefined) obj.upc = data.upc
  if (data.mpn !== undefined) obj.mpn = data.mpn
  if (data.quantity !== undefined) obj.quantity = data.quantity
  if (data.reference !== undefined) obj.reference = data.reference
  if (data.supplier_reference !== undefined) obj.supplier_reference = data.supplier_reference
  if (data.wholesale_price !== undefined) obj.wholesale_price = data.wholesale_price
  if (data.price !== undefined) obj.price = data.price
  if (data.ecotax !== undefined) obj.ecotax = data.ecotax
  if (data.weight !== undefined) obj.weight = data.weight
  if (data.unit_price_impact !== undefined) obj.unit_price_impact = data.unit_price_impact
  if (data.low_stock_threshold !== undefined) obj.low_stock_threshold = data.low_stock_threshold
  if (data.low_stock_alert !== undefined) obj.low_stock_alert = data.low_stock_alert ? 1 : 0
  if (data.default_on !== undefined) obj.default_on = data.default_on ? 1 : 0
  if (data.available_date !== undefined) obj.available_date = data.available_date
  if (data.associations !== undefined) obj.associations = stripXlinkAttributes(data.associations)

  const xmlRequest = jsonToXml({
    prestashop: {
      combination: obj
    }
  })

  const xmlResponse = await post({
    resource: 'combinations',
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function updateCombination(id, data) {
  if (id === undefined || id === null || id === '') throw new Error('ID combinaison manquant pour la modification')

  const obj = {
    id: id,
    id_product: data.id_product, // Obligatoire
    minimal_quantity: data.minimal_quantity || 1 // Obligatoire
  }

  // Optionnels
  if (data.location !== undefined) obj.location = data.location
  if (data.ean13 !== undefined) obj.ean13 = data.ean13
  if (data.isbn !== undefined) obj.isbn = data.isbn
  if (data.upc !== undefined) obj.upc = data.upc
  if (data.mpn !== undefined) obj.mpn = data.mpn
  if (data.quantity !== undefined) obj.quantity = data.quantity
  if (data.reference !== undefined) obj.reference = data.reference
  if (data.supplier_reference !== undefined) obj.supplier_reference = data.supplier_reference
  if (data.wholesale_price !== undefined) obj.wholesale_price = data.wholesale_price
  if (data.price !== undefined) obj.price = data.price
  if (data.ecotax !== undefined) obj.ecotax = data.ecotax
  if (data.weight !== undefined) obj.weight = data.weight
  if (data.unit_price_impact !== undefined) obj.unit_price_impact = data.unit_price_impact
  if (data.low_stock_threshold !== undefined) obj.low_stock_threshold = data.low_stock_threshold
  if (data.low_stock_alert !== undefined) obj.low_stock_alert = data.low_stock_alert ? 1 : 0
  if (data.default_on !== undefined) obj.default_on = data.default_on ? 1 : 0
  if (data.available_date !== undefined) obj.available_date = data.available_date
  if (data.associations !== undefined) obj.associations = stripXlinkAttributes(data.associations)

  const xmlRequest = jsonToXml({
    prestashop: {
      combination: obj
    }
  })

  const xmlResponse = await put({
    resource: 'combinations',
    id: id,
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function deleteCombination(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID combinaison manquant')
  const xml = await del({ resource: 'combinations', id })
  return xmlToJson(xml)
}
