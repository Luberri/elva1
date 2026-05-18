import { get, post, put, del, xmlToJson, jsonToXml, toText } from '../api/util.js'

export function formatStockData(stock) {
  if (!stock) return null
  return {
    id: String(stock.id || ''),
    id_product: toText(stock.id_product),
    id_product_attribute: toText(stock.id_product_attribute),
    id_shop: toText(stock.id_shop),
    id_shop_group: toText(stock.id_shop_group),
    quantity: toText(stock.quantity),
    depends_on_stock: toText(stock.depends_on_stock),
    out_of_stock: toText(stock.out_of_stock),
    location: toText(stock.location),
  }
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

export async function apiStock(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID stock manquant')
  const xml = await get({ resource: 'stock_availables', id })
  return xmlToJson(xml)
}

export async function apiStocks(options = {}) {
  const xml = await get({ resource: 'stock_availables', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function getStockDetail(id) {
  const detail = await apiStock(id)
  const stock = detail?.prestashop?.stock_available ?? null
  return formatStockData(stock)
}

export async function getAllStocks(options = {}) {
  const data = await apiStocks(options)
  const stocksNode = data?.prestashop?.stock_availables?.stock_available
  
  if (!stocksNode) {
    return []
  }

  const list = Array.isArray(stocksNode) ? stocksNode : [stocksNode]

  return list.map(item => formatStockData(item)).filter(r => r !== null)
}

export async function deleteStock(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID stock manquant')
  const xml = await del({ resource: 'stock_availables', id })
  return xmlToJson(xml)
}

export async function createStockAv(data) {
  console.log('StockAvvvvvv.....')
  const stockObj = {
    id_product: data.id_product,
    id_product_attribute: data.id_product_attribute || 0,
    quantity: data.quantity || 0,
    depends_on_stock: data.depends_on_stock !== undefined ? data.depends_on_stock : 0,
    out_of_stock: data.out_of_stock !== undefined ? data.out_of_stock : 2, // 2 = default behavior in Prestashop
  }

  if (data.id_shop) stockObj.id_shop = data.id_shop
  if (data.id_shop_group) stockObj.id_shop_group = data.id_shop_group
  if (data.location) stockObj.location = data.location

  const xmlRequest = jsonToXml({
    prestashop: {
      stock_available: stockObj
    }
  })

  const xmlResponse = await post({
    resource: 'stock_availables',
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function updateStockAv(id, data) {
  if (id === undefined || id === null || id === '') throw new Error('ID stock manquant pour la modification')
  
  const stockObj = {
    id: id,
    id_product: data.id_product,
    id_product_attribute: data.id_product_attribute || 0,
    id_shop: data.id_shop || '1',
    id_shop_group: data.id_shop_group || '1',
    quantity: data.quantity || 0,
    depends_on_stock: data.depends_on_stock !== undefined ? data.depends_on_stock : 0,
    out_of_stock: data.out_of_stock !== undefined ? data.out_of_stock : 2,
  }

  if (data.location) stockObj.location = data.location

  const xmlRequest = jsonToXml({
    prestashop: {
      stock_available: stockObj
    }
  })

  const xmlResponse = await put({
    resource: 'stock_availables',
    id: id,
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}
