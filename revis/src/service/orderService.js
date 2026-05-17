import { get, post, put, del, xmlToJson, jsonToXml, toText, DEFAULT_CURRENCY_ID } from '../api/util.js'

export function formatOrderData(order) {
  if (!order) return null
  
  let orderRows = []
  const rowsNode = order.associations?.order_rows?.order_row
  if (rowsNode) {
    const list = Array.isArray(rowsNode) ? rowsNode : [rowsNode]
    orderRows = list.map(row => ({
      id: toText(row.id),
      product_id: toText(row.product_id),
      product_attribute_id: toText(row.product_attribute_id),
      product_quantity: toText(row.product_quantity),
      product_name: toText(row.product_name),
      product_reference: toText(row.product_reference),
      product_price: toText(row.product_price),
      unit_price_tax_incl: toText(row.unit_price_tax_incl),
      unit_price_tax_excl: toText(row.unit_price_tax_excl),
    }))
  }

  return {
    id: String(order.id || ''),
    reference: toText(order.reference),
    id_address_delivery: toText(order.id_address_delivery),
    id_address_invoice: toText(order.id_address_invoice),
    id_cart: toText(order.id_cart),
    id_currency: toText(order.id_currency),
    id_lang: toText(order.id_lang),
    id_customer: toText(order.id_customer),
    id_carrier: toText(order.id_carrier),
    current_state: toText(order.current_state),
    module: toText(order.module),
    payment: toText(order.payment),
    total_paid: toText(order.total_paid),
    total_paid_real: toText(order.total_paid_real),
    total_products: toText(order.total_products),
    total_products_wt: toText(order.total_products_wt),
    conversion_rate: toText(order.conversion_rate),
    date_add: toText(order.date_add),
    orderRows: orderRows
  }
}

function formatOrderStateData(state) {
  if (!state) return null
  return {
    id: String(state.id || ''),
    name: toText(state.name),
    color: toText(state.color)
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

export async function apiOrder(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID order manquant')
  const xml = await get({ resource: 'orders', id })
  return xmlToJson(xml)
}

export async function apiOrders(options = {}) {
  const xml = await get({ resource: 'orders', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function apiOrdersByCart(idCart) {
  if (idCart === undefined || idCart === null || idCart === '') throw new Error('ID cart manquant')
  const xml = await get({
    resource: 'orders',
    query: {
      'filter[id_cart]': idCart,
      display: 'full'
    }
  })
  return xmlToJson(xml)
}

export async function isCartOrdered(idCart) {
  const data = await apiOrdersByCart(idCart)
  const ordersNode = data?.prestashop?.orders?.order
  if (!ordersNode) return false
  if (Array.isArray(ordersNode)) return ordersNode.length > 0
  return true
}

export async function apiOrderState(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID order_state manquant')
  const xml = await get({ resource: 'order_states', id })
  return xmlToJson(xml)
}

export async function apiOrderStates(options = {}) {
  const xml = await get({ resource: 'order_states', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function getOrderDetail(id) {
  const detail = await apiOrder(id)
  const order = detail?.prestashop?.order ?? null
  return formatOrderData(order)
}

export async function getAllOrders(options = {}) {
  const data = await apiOrders(options)
  const ordersNode = data?.prestashop?.orders?.order
  
  if (!ordersNode) {
    return []
  }

  const list = Array.isArray(ordersNode) ? ordersNode : [ordersNode]
  return list.map(item => formatOrderData(item)).filter(r => r !== null)
}

export function getOrderDateKey(order) {
  if (!order) return ''
  const value = String(order.date_add || '').trim()
  if (!value) return ''
  return value.split(' ')[0]
}

export function filterOrdersByDate(orders, dateKey) {
  if (!dateKey) return Array.isArray(orders) ? orders : []
  const list = Array.isArray(orders) ? orders : []
  return list.filter(order => getOrderDateKey(order) === dateKey)
}

export function sumOrderTotals(orders) {
  const list = Array.isArray(orders) ? orders : []
  let totalHt = 0
  let totalTtc = 0

  for (const order of list) {
    const ht = Number(order?.total_products || 0)
    const ttc = Number(order?.total_paid || order?.total_products_wt || 0)
    totalHt += ht
    totalTtc += ttc
  }

  return {
    totalHt,
    totalTtc,
    count: list.length
  }
}

export function buildOrderStateStats(orders, stateMap) {
  const list = Array.isArray(orders) ? orders : []
  const counts = new Map()

  for (const order of list) {
    const key = String(order?.current_state || '')
    if (!key) continue
    counts.set(key, (counts.get(key) || 0) + 1)
  }

  const rows = Array.from(counts.entries()).map(([id, count]) => {
    const state = stateMap?.get?.(String(id))
    return {
      id: String(id),
      name: state?.name || id,
      color: state?.color || 'transparent',
      count
    }
  })

  return rows.sort((a, b) => b.count - a.count)
}

export async function getOrderStateDetail(id) {
  const detail = await apiOrderState(id)
  const state = detail?.prestashop?.order_state ?? null
  if (!state) return null
  return {
    id: String(state.id || ''),
    name: toText(state.name),
    color: toText(state.color)
  }
}

export async function getAllOrderStates(options = {}) {
  const data = await apiOrderStates(options)
  const statesNode = data?.prestashop?.order_states?.order_state

  if (!statesNode) return []

  const list = Array.isArray(statesNode) ? statesNode : [statesNode]

  return list.map(item => formatOrderStateData(item)).filter(r => r !== null)
}

export async function deleteOrder(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID order manquant')
  const xml = await del({ resource: 'orders', id })
  return xmlToJson(xml)
}

export async function createOrderHistory(data) {
  if (!data?.id_order) throw new Error('ID order manquant pour l\'historique')
  if (!data?.id_order_state) throw new Error('ID order_state manquant pour l\'historique')

  const historyObj = {
    id_employee: data.id_employee ?? 1,
    id_order_state: data.id_order_state,
    id_order: data.id_order
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      order_history: historyObj
    }
  })

  const xmlResponse = await post({
    resource: 'order_histories',
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function createOrder(data) {
  const orderObj = {
    id_address_delivery: data.id_address_delivery,
    id_address_invoice: data.id_address_invoice,
    id_cart: data.id_cart,
    id_currency: data.id_currency ?? DEFAULT_CURRENCY_ID,
    id_lang: data.id_lang,
    id_customer: data.id_customer,
    id_carrier: data.id_carrier,
    secure_key: data.secure_key,
    module: data.module || 'ps_wirepayment',
    payment: data.payment || 'Bank wire',
    total_paid: data.total_paid,
    total_paid_real: data.total_paid_real,
    total_products: data.total_products,
    total_products_wt: data.total_products_wt,
    conversion_rate: data.conversion_rate || 1,
    current_state: 13
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      order: orderObj
    }
  })

  const xmlResponse = await post({
    resource: 'orders',
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}
export async function updateOrderDates(id, dateAdd) {
  if (!id) {
    throw new Error('ID order manquant pour la mise a jour de date_add')
  }

  if (!dateAdd) {
    throw new Error('date_add manquant pour la mise a jour')
  }

  // 1. récupérer le XML complet de la commande
  const currentXml = await get({
    resource: 'orders',
    id
  })

  const currentJson = xmlToJson(currentXml)

  const sourceOrder = currentJson?.prestashop?.order

  if (!sourceOrder) {
    throw new Error('Commande introuvable')
  }

  const order = buildSafeOrderUpdatePayload(sourceOrder, dateAdd)
  cleanUndefined(order)

  const xmlRequest = jsonToXml({
    prestashop: {
      order
    }
  })

  const xmlResponse = await put({
    resource: 'orders',
    id,
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

function buildSafeOrderUpdatePayload(source, dateAdd) {
  return {
    id: toText(source.id),
    id_address_delivery: toText(source.id_address_delivery),
    id_address_invoice: toText(source.id_address_invoice),
    id_cart: toText(source.id_cart),
    id_currency: toText(source.id_currency),
    id_lang: toText(source.id_lang),
    id_customer: toText(source.id_customer),
    id_carrier: toText(source.id_carrier),
    current_state: toText(source.current_state),
    module: toText(source.module),
    payment: toText(source.payment),
    invoice_number: toText(source.invoice_number),
    invoice_date: toText(source.invoice_date),
    delivery_number: toText(source.delivery_number),
    delivery_date: toText(source.delivery_date),
    valid: toText(source.valid),
    date_add: dateAdd,
    date_upd: toText(source.date_upd) || dateAdd,
    shipping_number: toText(source.shipping_number),
    note: toText(source.note),
    id_shop_group: toText(source.id_shop_group),
    id_shop: toText(source.id_shop),
    secure_key: toText(source.secure_key),
    recyclable: toText(source.recyclable),
    gift: toText(source.gift),
    gift_message: toText(source.gift_message),
    mobile_theme: toText(source.mobile_theme),
    total_discounts: toText(source.total_discounts),
    total_discounts_tax_incl: toText(source.total_discounts_tax_incl),
    total_discounts_tax_excl: toText(source.total_discounts_tax_excl),
    total_paid: toText(source.total_paid),
    total_paid_tax_incl: toText(source.total_paid_tax_incl),
    total_paid_tax_excl: toText(source.total_paid_tax_excl),
    total_paid_real: toText(source.total_paid_real),
    total_products: toText(source.total_products),
    total_products_wt: toText(source.total_products_wt),
    total_shipping: toText(source.total_shipping),
    total_shipping_tax_incl: toText(source.total_shipping_tax_incl),
    total_shipping_tax_excl: toText(source.total_shipping_tax_excl),
    carrier_tax_rate: toText(source.carrier_tax_rate),
    total_wrapping: toText(source.total_wrapping),
    total_wrapping_tax_incl: toText(source.total_wrapping_tax_incl),
    total_wrapping_tax_excl: toText(source.total_wrapping_tax_excl),
    round_mode: toText(source.round_mode),
    round_type: toText(source.round_type),
    conversion_rate: toText(source.conversion_rate),
    reference: toText(source.reference)
  }
}

function cleanUndefined(obj) {
  if (!obj || typeof obj !== 'object') return

  for (const key of Object.keys(obj)) {
    const value = obj[key]

    if (value === undefined) {
      delete obj[key]
      continue
    }

    if (value && typeof value === 'object') {
      cleanUndefined(value)
    }
  }
}


export async function createOrderPayment(data) {
  if (!data?.order_reference) throw new Error('order_reference manquant')
  const idCurrency = data?.id_currency ?? DEFAULT_CURRENCY_ID
  if (data?.amount === undefined || data?.amount === null) throw new Error('amount manquant')

  const paymentObj = {
    order_reference: data.order_reference,
    id_currency: idCurrency,
    amount: data.amount,
    payment_method: data.payment_method || 'Cheque',
    conversion_rate: data.conversion_rate || 1,
    transaction_id: data.transaction_id || ''
  }

  if (data.id_employee) paymentObj.id_employee = data.id_employee
  if (data.card_number) paymentObj.card_number = data.card_number
  if (data.card_brand) paymentObj.card_brand = data.card_brand
  if (data.card_expiration) paymentObj.card_expiration = data.card_expiration
  if (data.card_holder) paymentObj.card_holder = data.card_holder
  if (data.date_add) paymentObj.date_add = data.date_add

  const xmlRequest = jsonToXml({
    prestashop: {
      order_payment: paymentObj
    }
  })

  const xmlResponse = await post({
    resource: 'order_payments',
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function updateOrder(id, data) {
  if (id === undefined || id === null || id === '') throw new Error('ID order manquant pour la modification')

  const orderObj = {
    id: id,
    id_address_delivery: data.id_address_delivery,
    id_address_invoice: data.id_address_invoice,
    id_cart: data.id_cart,
    id_currency: data.id_currency,
    id_lang: data.id_lang,
    id_customer: data.id_customer,
    id_carrier: data.id_carrier,
    module: data.module,
    payment: data.payment,
    total_paid: data.total_paid,
    total_paid_real: data.total_paid_real,
    total_products: data.total_products,
    total_products_wt: data.total_products_wt,
    conversion_rate: data.conversion_rate,
    current_state: data.current_state
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      order: orderObj
    }
  })

  const xmlResponse = await put({
    resource: 'orders',
    id: id,
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}