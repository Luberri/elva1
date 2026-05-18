import { get, post, put, del, xmlToJson, jsonToXml, toText, DEFAULT_CURRENCY_ID } from '../api/util.js'
import { getCartDetail } from './cartService.js'
import { getAllStocks as getStockAvailables } from './stockAvailableService.js'
import { getAllStocks as getPhysicalStocks, createStock } from './stockService.js'
import { createStockMvt, getAllStockMvts, updateStockMvtDate } from './stockMvtService.js'
import { getProductDetail } from './productService.js'

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

const ORDER_DATE_LIMIT = new Date(2020, 4, 30)

function parseAvailabilityDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const dateOnly = raw.split(' ')[0]
  const match = dateOnly.match(/^\d{4}-\d{2}-\d{2}$/)
  if (!match) return null
  const [year, month, day] = dateOnly.split('-').map(part => Number(part))
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function assertProductDateAllowed(product, contextLabel) {
  if (!product) return
  const availability = parseAvailabilityDate(
    product.date_availability_produit || product.available_date
  )
  if (!availability) return
  if (availability < ORDER_DATE_LIMIT) {
    throw new Error(
      `${contextLabel}: produit ${product.id} interdit avant le ${ORDER_DATE_LIMIT.toISOString().split('T')[0]} (date_availability_produit: ${product.date_availability_produit}, available_date: ${product.available_date})`
    )
  }
}

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

  const res = xmlToJson(xmlResponse)

  // Si l'état passé est paiement accepté (2) ou livré (5), créer mouvements de sortie
  const state = Number(data.id_order_state)
  // if (state === 2 || state === 5) {
    try {
      await createStockMovementsForOrder(data.id_order)
    } catch (e) {
      console.error('Erreur création mouvements après history:', e?.message || e)
    // }
  }

  return res
}

async function createStockMovementsForOrder(orderId) {
  if (!orderId) return
  try {
    console.log(`Création mouvements de stock pour la commandeeeeeeeeee ${orderId}...`)
    const detail = await getOrderDetail(orderId)
    const rows = detail?.orderRows || []
    for (const row of rows) {
      const id_product = String(row.product_id || row.id_product || '')
      const id_product_attribute = String(row.product_attribute_id || row.id_product_attribute || '0')
      const qty = Number(row.product_quantity || 0)
      if (!id_product || !qty) continue

      // find physical stock id
      const phys = await getPhysicalStocks({ filters: { id_product, id_product_attribute } })
      let stock = Array.isArray(phys) && phys.length ? phys[0] : null

      if (!stock) {
        try {
          const created = await createStock({
            id_product,
            id_product_attribute,
            physical_quantity: 0,
            usable_quantity: 0,
            price_te: row.unit_price_tax_excl || row.product_price || 0,
            id_employee: 1
          })
          const createdId = created?.prestashop?.stock?.id
          if (createdId) {
            stock = { id: createdId }
          }
        } catch (e) {
          console.error('Erreur création stock physique avant mouvement:', e?.message || e)
        }
      }

      const id_stock = stock?.id
      if (!id_stock) {
        console.error('Stock physique introuvable pour mouvement:', {
          id_product,
          id_product_attribute
        })
        continue
      }

      const mvt = {
        id_product,
        id_product_attribute,
        id_stock,
        id_order: String(orderId),
        price_te: row.unit_price_tax_excl || row.product_price || 0,
        physical_quantity: qty,
        id_employee: 1,
        id_stock_mvt_reason: 2,
        date_add: formatDateTime(new Date()),
        sign: -1
      }

      try {
        await createStockMvt(mvt)
      } catch (e) {
        console.error('Erreur création stock_mvt sortie:', e?.message || e)
      }
    }
  } catch (e) {
    console.error('Erreur lors de la création des mouvements pour la commande', e?.message || e)
  }
}

export async function createOrder(data) {
  // Vérifier les quantités disponibles pour chaque ligne du panier (cartRows)
  const rows = Array.isArray(data.cartRows) && data.cartRows.length
    ? data.cartRows
    : (data.id_cart ? (await getCartDetail(data.id_cart))?.cartRows || [] : [])

  if (rows && rows.length) {
    for (const row of rows) {
      const id_product = String(row.id_product || row.product_id || '')
      const id_product_attribute = String(row.id_product_attribute || row.product_attribute_id || '0')
      const qtyRequested = Number(row.quantity || row.product_quantity || 0)

      if (!id_product) continue

      const product = await getProductDetail(id_product)
      assertProductDateAllowed(product, 'Creation commande')

      // Récupérer le stock disponible (stock_availables)
      const stocks = await getStockAvailables({ filters: { id_product, id_product_attribute } })
      const stock = Array.isArray(stocks) && stocks.length ? stocks[0] : null

      let available = 0
      if (stock) {
        // si la gestion dépend du stock physique, sommer les stocks physiques
        const depends = String(stock.depends_on_stock || '0')
        if (depends === '1') {
          const phys = await getPhysicalStocks({ filters: { id_product, id_product_attribute } })
          if (Array.isArray(phys) && phys.length) {
            available = phys.reduce((sum, s) => sum + Number(s.physical_quantity || 0), 0)
          } else {
            available = 0
          }
        } else {
          available = Number(stock?.quantity || 0)
        }
      } else {
        available = 0
      }

      if (qtyRequested > available) {
        throw new Error(`Stock insuffisant pour produit ${id_product} attr ${id_product_attribute} : demandé ${qtyRequested}, disponible ${available}`)
      }
    }
  }

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

  const res = xmlToJson(xmlResponse)

  // créer mouvements si l'état demandé est paiement accepté (2) ou livré (5)
  const requestedState = Number(data.current_state || res?.prestashop?.order?.current_state || 0)
  const orderId = res?.prestashop?.order?.id
  if ((requestedState === 2 || requestedState === 5) && orderId) {
    try {
      await createStockMovementsForOrder(orderId)
    } catch (e) {
      console.error('Erreur création mouvements après création commande:', e?.message || e)
    }
  }

  return res
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

  const response = xmlToJson(xmlResponse)

  try {
    const movements = await getAllStockMvts({ filters: { id_order: id }, display: 'full' })
    if (Array.isArray(movements) && movements.length) {
      await Promise.all(
        movements
          .filter(m => m?.id)
          .map(m => updateStockMvtDate(m.id, dateAdd))
      )
    }
  } catch (e) {
    console.error('Erreur mise a jour date_add stock_mvt:', e?.message || e)
  }

  return response
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

  const res = xmlToJson(xmlResponse)

  // Si on met à jour la commande vers paiement accepté (2) ou livré (5), créer mouvements de sortie
  const newState = Number(data.current_state)
  if ((newState === 2 || newState === 5)) {
    try {
      await createStockMovementsForOrder(id)
    } catch (e) {
      console.error('Erreur création mouvements après update commande:', e?.message || e)
    }
  }

  return res
}