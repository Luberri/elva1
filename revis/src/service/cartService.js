import { get, post, put, del, xmlToJson, jsonToXml, toText, DEFAULT_CURRENCY_ID } from '../api/util.js'
import { isCartOrdered } from './orderService.js'
import { getProductDetail } from './productService.js'

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

export function formatCartData(cart) {
  if (!cart) return null
  
  let cartRows = []
  const rowsNode = cart.associations?.cart_rows?.cart_row
  if (rowsNode) {
    const list = Array.isArray(rowsNode) ? rowsNode : [rowsNode]
    cartRows = list.map(row => ({
      id_product: toText(row.id_product),
      id_product_attribute: toText(row.id_product_attribute),
      id_address_delivery: toText(row.id_address_delivery),
      id_customization: toText(row.id_customization),
      quantity: toText(row.quantity),
    }))
  }

  return {
    id: String(cart.id || ''),
    id_address_delivery: toText(cart.id_address_delivery),
    id_address_invoice: toText(cart.id_address_invoice),
    id_currency: toText(cart.id_currency),
    id_customer: toText(cart.id_customer),
    id_guest: toText(cart.id_guest),
    id_lang: toText(cart.id_lang),
    id_shop_group: toText(cart.id_shop_group),
    id_shop: toText(cart.id_shop),
    id_carrier: toText(cart.id_carrier),
    recyclable: toText(cart.recyclable),
    gift: toText(cart.gift),
    gift_message: toText(cart.gift_message),
    date_add: toText(cart.date_add),
    date_upd: toText(cart.date_upd),
    cartRows: cartRows
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

export async function apiCart(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID cart manquant')
  const xml = await get({ resource: 'carts', id })
  return xmlToJson(xml)
}

export async function apiCarts(options = {}) {
  const xml = await get({ resource: 'carts', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function apiCartsByCustomer(idCustomer) {
  if (idCustomer === undefined || idCustomer === null || idCustomer === '') {
    throw new Error('ID customer manquant')
  }

  const xml = await get({
    resource: 'carts',
    query: {
      'filter[id_customer]': idCustomer,
      display: 'full'
    }
  })

  return xmlToJson(xml)
}

export async function getCartDetail(id) {
  const detail = await apiCart(id)
  const cart = detail?.prestashop?.cart ?? null
  return formatCartData(cart)
}

export async function getAllCarts(options = {}) {
  const data = await apiCarts(options)
  const cartsNode = data?.prestashop?.carts?.cart
  
  if (!cartsNode) {
    return []
  }

  const list = Array.isArray(cartsNode) ? cartsNode : [cartsNode]
  return list.map(item => formatCartData(item)).filter(r => r !== null)
}

export async function getCartByCustomer(idCustomer) {
  const openCarts = await getOpenCartsByCustomer(idCustomer)
  if (!openCarts.length) return null
  return openCarts[0]
}

export async function getOpenCartsByCustomer(idCustomer) {
  const data = await apiCartsByCustomer(idCustomer)
  const cartsNode = data?.prestashop?.carts?.cart
  if (!cartsNode) return []

  const list = Array.isArray(cartsNode) ? cartsNode : [cartsNode]
  const sorted = list
    .map(item => ({
      id: toText(item?.id || item?.['@id']),
      date_add: toText(item?.date_add),
      raw: item
    }))
    .filter(item => item.id)
    .sort((a, b) => {
      const aTime = Date.parse(a.date_add || '') || 0
      const bTime = Date.parse(b.date_add || '') || 0
      if (aTime !== bTime) return bTime - aTime
      return Number(b.id) - Number(a.id)
    })

  if (!sorted.length) return []

  const checks = await Promise.all(
    sorted.map(async (item) => {
      const ordered = await isCartOrdered(item.id)
      return { ...item, ordered }
    })
  )

  const open = checks.filter(item => !item.ordered)
  if (!open.length) return []

  const rows = await Promise.all(
    open.map(async (item) => {
      const rawCart = item.raw
      if (rawCart?.associations?.cart_rows?.cart_row) {
        return formatCartData(rawCart)
      }
      return await getCartDetail(item.id)
    })
  )

  return rows.filter(r => r !== null)
}

export async function deleteCart(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID cart manquant')
  const xml = await del({ resource: 'carts', id })
  return xmlToJson(xml)
}

export async function createCart(data) {
  if (data.cartRows && data.cartRows.length) {
    for (const row of data.cartRows) {
      const idProduct = row.id_product
      if (!idProduct) continue
      const product = await getProductDetail(idProduct)
      assertProductDateAllowed(product, 'Creation panier')
    }
  }

  const cartObj = {
    id_currency: data.id_currency || DEFAULT_CURRENCY_ID,
    id_lang: data.id_lang || 1,
    id_shop_group: 1,
    id_shop: 1
  }

  if (data.id_address_delivery) cartObj.id_address_delivery = data.id_address_delivery
  if (data.id_address_invoice) cartObj.id_address_invoice = data.id_address_invoice
  if (data.id_customer) cartObj.id_customer = data.id_customer
  if (data.id_carrier) cartObj.id_carrier = data.id_carrier

  if (data.cartRows && data.cartRows.length) {
    cartObj.associations = {
      cart_rows: {
        cart_row: data.cartRows.map(row => ({
          id_product: row.id_product,
          id_product_attribute: row.id_product_attribute || 0,
          id_address_delivery: row.id_address_delivery || data.id_address_delivery || 0,
          quantity: row.quantity || 1
        }))
      }
    }
  }

  const exactCart = buildExactCartObject(cartObj)
  const xmlRequest = jsonToXml({
    prestashop: {
      '@xmlns:xlink': 'http://www.w3.org/1999/xlink',
      cart: exactCart
    }
  })

  const xmlResponse = await post({
    resource: 'carts',
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function updateCart(id, data) {
  if (id === undefined || id === null || id === '') throw new Error('ID cart manquant pour la modification')

  const currentXml = await get({ resource: 'carts', id })
  const currentJson = xmlToJson(currentXml)
  const sourceCart = currentJson?.prestashop?.cart

  if (!sourceCart) {
    throw new Error('Panier introuvable')
  }

  const cartObj = buildSafeCartUpdatePayload(sourceCart, data)

  const xmlRequest = jsonToXml({
    prestashop: {
      cart: cartObj
    }
  })

  const xmlResponse = await put({
    resource: 'carts',
    id: id,
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

// Build an ordered cart object matching the exact XML model required by PrestaShop
function buildExactCartObject(cartObj) {
  // ensure strings for empty fields where PrestaShop expects empty tags
  const gift_message = cartObj.gift_message ?? ''
  const delivery_option = cartObj.delivery_option ?? ''

  const associations = { cart_rows: { cart_row: [] } }
  const rows = Array.isArray(cartObj.associations?.cart_rows?.cart_row)
    ? cartObj.associations.cart_rows.cart_row
    : (cartObj.associations?.cart_rows?.cart_row ? [cartObj.associations.cart_rows.cart_row] : [])

  for (const r of rows) {
    associations.cart_rows.cart_row.push({
      id_product: toText(r.id_product),
      id_product_attribute: toText(r.id_product_attribute) || '0',
      id_address_delivery: toText(r.id_address_delivery) || '0',
      quantity: toText(r.quantity) || '1'
    })
  }

  // maintain the order of keys as in the example XML
  const ordered = {
    id: toText(cartObj.id),

    id_currency: toText(cartObj.id_currency),
    id_lang: toText(cartObj.id_lang),
    id_customer: toText(cartObj.id_customer),

    id_address_delivery: toText(cartObj.id_address_delivery),
    id_address_invoice: toText(cartObj.id_address_invoice),

    id_carrier: toText(cartObj.id_carrier),

    recyclable: toText(cartObj.recyclable ?? '0'),
    gift: toText(cartObj.gift ?? '0'),
    gift_message: gift_message,

    mobile_theme: toText(cartObj.mobile_theme ?? '0'),

    delivery_option: delivery_option,

    secure_key: toText(cartObj.secure_key),

    allow_seperated_package: toText(cartObj.allow_seperated_package ?? '0'),

    date_add: toText(cartObj.date_add),
    date_upd: toText(cartObj.date_upd),

    associations: associations
  }

  return ordered
}

export async function updateCartDates(id, dateAdd) {
  if (id === undefined || id === null || id === '') {
    throw new Error('ID cart manquant pour la mise a jour de date_add')
  }

  if (!dateAdd) {
    throw new Error('date_add manquant pour la mise a jour')
  }
  // Fetch raw XML, modify only the date tags (use CDATA) and PUT the raw XML back.
  let xml = await get({ resource: 'carts', id })
  if (xml === undefined || xml === null) throw new Error('Panier introuvable')
  xml = String(xml)

  const cdata = `<![CDATA[${dateAdd}]]>`

  // Replace existing <date_add>...</date_add>
  if (/<date_add>[\s\S]*?<\/date_add>/.test(xml)) {
    xml = xml.replace(/<date_add>[\s\S]*?<\/date_add>/, `<date_add>${cdata}</date_add>`)
  } else {
    // fallback: insert before closing </cart>
    xml = xml.replace(/<\/cart>/, `  <date_add>${cdata}</date_add>\n  </cart>`)
  }

  // Replace existing <date_upd>...</date_upd>
  if (/<date_upd>[\s\S]*?<\/date_upd>/.test(xml)) {
    xml = xml.replace(/<date_upd>[\s\S]*?<\/date_upd>/, `<date_upd>${cdata}</date_upd>`)
  } else if (/<\/cart>/.test(xml)) {
    xml = xml.replace(/<\/cart>/, `  <date_upd>${cdata}</date_upd>\n  </cart>`)
  }

  // Ensure root has xmlns:xlink attribute — if missing, add it to <prestashop>
  if (/^\s*<prestashop(?![^>]*xmlns:xlink)/m.test(xml)) {
    xml = xml.replace(/<prestashop(\s*)/m, `<prestashop xmlns:xlink="http://www.w3.org/1999/xlink"$1`)
  }

  const xmlResponse = await put({ resource: 'carts', id, body: xml })
  return xmlToJson(xmlResponse)
}

function buildSafeCartUpdatePayload(source, data = {}) {
  const sourceRows = source?.associations?.cart_rows?.cart_row
  const rowsList = Array.isArray(sourceRows) ? sourceRows : (sourceRows ? [sourceRows] : [])
  const providedRows = Array.isArray(data.cartRows) ? data.cartRows : null
  const hasProvidedRows = Array.isArray(data.cartRows)
  const rowsToUse = hasProvidedRows ? providedRows : rowsList
  const cartRows = rowsToUse.map(row => ({
    id_product: toText(row.id_product),
    id_product_attribute: toText(row.id_product_attribute) || '0',
    id_address_delivery: toText(row.id_address_delivery) || toText(data.id_address_delivery) || toText(source.id_address_delivery) || '0',
    id_customization: toText(row.id_customization),
    quantity: toText(row.quantity) || '1'
  }))

  const cartObj = {
    id: toText(source.id),
    id_address_delivery: toText(data.id_address_delivery ?? source.id_address_delivery),
    id_address_invoice: toText(data.id_address_invoice ?? source.id_address_invoice),
    id_currency: toText(data.id_currency ?? source.id_currency) || String(DEFAULT_CURRENCY_ID),
    id_customer: toText(data.id_customer ?? source.id_customer),
    id_guest: toText(source.id_guest),
    id_lang: toText(data.id_lang ?? source.id_lang) || '1',
    id_shop_group: toText(source.id_shop_group) || '1',
    id_shop: toText(source.id_shop) || '1',
    id_carrier: toText(data.id_carrier ?? source.id_carrier),
    recyclable: toText(data.recyclable ?? source.recyclable) || '0',
    gift: toText(data.gift ?? source.gift) || '0',
    gift_message: toText(data.gift_message ?? source.gift_message),
    mobile_theme: toText(source.mobile_theme) || '0',
    delivery_option: toText(source.delivery_option),
    secure_key: toText(source.secure_key),
    allow_seperated_package: toText(source.allow_seperated_package) || '0',
    date_add: toText(data.date_add ?? source.date_add),
    date_upd: toText(data.date_upd ?? source.date_upd ?? data.date_add ?? source.date_add),
    associations: {
      cart_rows: (hasProvidedRows && cartRows.length === 0)
        ? {}
        : { cart_row: cartRows }
    }
  }

  cleanUndefined(cartObj)
  return cartObj
}

function cleanUndefined(obj) {
  if (!obj || typeof obj !== 'object') return

  for (const key of Object.keys(obj)) {
    const value = obj[key]

    if (value === undefined || value === null) {
      delete obj[key]
      continue
    }

    if (Array.isArray(value)) {
      for (const item of value) cleanUndefined(item)
      continue
    }

    if (typeof value === 'object') {
      cleanUndefined(value)
    }
  }
}

export async function addToCart(data) {
  const idCustomer = data.id_customer || ''
  const idProduct = data.id_product
  const idProductAttribute = data.id_product_attribute || 0
  const quantity = Number(data.quantity || 1)

  if (!idProduct) throw new Error('ID produit manquant pour le panier')

  const product = await getProductDetail(idProduct)
  assertProductDateAllowed(product, 'Ajout panier')

  let cartId = localStorage.getItem('fo_cart_id')
  let cart = null

  if (cartId) {
    try {
      const ordered = await isCartOrdered(cartId)
      if (ordered) {
        cartId = null
        localStorage.removeItem('fo_cart_id')
      }
    } catch {
      cartId = null
      localStorage.removeItem('fo_cart_id')
    }
  }

  if (cartId) {
    try {
      cart = await getCartDetail(cartId)
      if (cart && idCustomer && String(cart.id_customer) !== String(idCustomer)) {
        cart = null
        localStorage.removeItem('fo_cart_id')
      }
    } catch {
      cart = null
    }
  }

  if (!cart) {
    if (idCustomer) {
      cart = await getCartByCustomer(idCustomer)
      if (cart?.id) {
        cartId = cart.id
        localStorage.setItem('fo_cart_id', String(cartId))
      }
    }
  }

  if (!cart) {
    const created = await createCart({
      id_currency: DEFAULT_CURRENCY_ID,
      id_lang: 1,
      id_customer: idCustomer || undefined,
      cartRows: [
        {
          id_product: String(idProduct),
          id_product_attribute: String(idProductAttribute || 0),
          id_address_delivery: 0,
          quantity: String(quantity)
        }
      ]
    })
    cartId = created?.prestashop?.cart?.id
    if (!cartId) throw new Error('Creation du panier impossible')
    localStorage.setItem('fo_cart_id', String(cartId))
    cart = await getCartDetail(cartId)
  }

  const rows = Array.isArray(cart.cartRows) ? cart.cartRows : []
  const existing = rows.find(r =>
    String(r.id_product) === String(idProduct) &&
    String(r.id_product_attribute || 0) === String(idProductAttribute)
  )

  if (existing) {
    existing.quantity = String((Number(existing.quantity || 0) + quantity))
  } else {
    rows.push({
      id_product: String(idProduct),
      id_product_attribute: String(idProductAttribute || 0),
      id_address_delivery: cart.id_address_delivery || 0,
      quantity: String(quantity)
    })
  }

  await updateCart(cart.id, {
    id_currency: cart.id_currency || DEFAULT_CURRENCY_ID,
    id_lang: cart.id_lang || 1,
    id_customer: cart.id_customer || idCustomer || undefined,
    id_address_delivery: cart.id_address_delivery || undefined,
    id_address_invoice: cart.id_address_invoice || undefined,
    cartRows: rows
  })

  return { cartId: String(cart.id) }
}