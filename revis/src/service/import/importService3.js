import Papa from 'papaparse'
import { DEFAULT_CURRENCY_ID, isPositif } from '../../api/util.js'
import { getAllProducts, getPriceTtcWithImpact, parsePriceValue } from '../productService.js'
import { getCombinationsByProduct } from '../combinationService.js'
import { createCustomer, getCustomerByEmail, getCustomerDetail } from '../customerService.js'
import { createAddress } from '../addressService.js'
import { createCart, updateCartDates } from '../cartService.js'
import { createOrder, createOrderHistory, getOrderDetail, updateOrderDates } from '../orderService.js'
import { getTaxRateForGroup } from '../taxeService.js'

function parseAchatItems(value) {
  if (!value) return []
  const text = String(value)
  const items = []

  const pattern = /\("([^"]*)";\s*([0-9]+)\s*;"([^"]*)"\)/g
  let match = null
  while ((match = pattern.exec(text)) !== null) {
    items.push({
      reference: match[1],
      quantity: Number(match[2] || 0),
      variant: match[3] || ''
    })
  }

  if (!items.length) {
    throw new Error('Format achat invalide')
  }

  return items
}

function normalizeStateLabel(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
}

const ORDER_STATE_BY_LABEL = new Map([
  ['paiement accepte', 2],
  ['en cours de preparation', 3],
  ['expedie', 4],
  ['livre', 5],
  ['annule', 6],
  ['rembourse', 7],
  ['erreur de paiement', 8],
  ['en attente de reapprovisionnement (paye)', 9],
  ['paiement a distance accepte', 11],
  ['en attente de reapprovisionnement (non paye)', 12],
  ['en attente de paiement a la livraison', 13],
  ['en attente paiement a la livraison', 13],
  ['en attente de paiement', 14],
  ['remboursement partiel', 15],
  ['paiement partiel', 16],
  ['autorisation. a capturer par le marchand', 17],
  ['en attente du paiement par cheque', 1],
  ['en attente de virement bancaire', 10],
  ['dans le panier', 0],
  ['', 0]
])

function ensureAllowedState(label) {
  const normalized = normalizeStateLabel(label)
  if (!ORDER_STATE_BY_LABEL.has(normalized)) {
    throw new Error('Etat invalide')
  }
  return normalized
}

function getOrderStateIdFromLabel(label) {
  const normalized = normalizeStateLabel(label)
  return ORDER_STATE_BY_LABEL.get(normalized) || 13
}

function getPaymentFromLabel(label) {
  const normalized = normalizeStateLabel(label)
  if (normalized.includes('livraison')) {
    return { module: 'ps_cashondelivery', payment: 'Payer comptant a la livraison' }
  }
  if (normalized.includes('cheque')) {
    return { module: 'ps_checkpayment', payment: 'Payer par cheque' }
  }
  if (normalized.includes('virement')) {
    return { module: 'ps_wirepayment', payment: 'Payer par virement bancaire' }
  }
  return { module: 'ps_wirepayment', payment: 'Payer par virement bancaire' }
}


export async function importDataFromCSV3(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true
  })

  const requiredColumns = [
    'date',
    'nom',
    'email',
    'pwd',
    'adresse',
    'achat',
    'etat'
  ]

  const fieldSet = new Set(parsed?.meta?.fields || [])
  const missingColumns = requiredColumns.filter((col) => !fieldSet.has(col))
  if (missingColumns.length) {
    throw new Error(`Colonnes manquantes: ${missingColumns.join(', ')}`)
  }

  const records = parsed.data.map((row, index) => ({
    ...row,
    __line: index + 2 // +2 because CSV has header on line 1
  }))
  if (records.length === 0) throw new Error("Le fichier CSV est vide ou n'a pas de données valides.")

  const products = await getAllProducts()
  const productMap = new Map(
    products
      .filter(p => p.reference)
      .map(p => [p.reference.trim().toLowerCase(), p])
  )

  const combinationsCache = new Map()
  async function getCombinationsCached(productId) {
    const key = String(productId)
    if (combinationsCache.has(key)) return combinationsCache.get(key)
    const list = await getCombinationsByProduct(productId)
    combinationsCache.set(key, list)
    return list
  }

  const taxRateMap = new Map()
  async function getTaxRateForProduct(prod) {
    const groupId = String(prod?.id_tax_rules_group || '0')
    if (taxRateMap.has(groupId)) return taxRateMap.get(groupId)
    const rate = await getTaxRateForGroup(groupId)
    taxRateMap.set(groupId, rate || 0)
    return rate || 0
  }

  const results = {
    customersCreated: 0,
    addressesCreated: 0,
    cartsCreated: 0,
    ordersCreated: 0
  }

  for (let i = 0; i < records.length; i++) {
    const row = records[i]

    try {
      const dateRaw = String(row.date || '').trim()
      const nom = String(row.nom || '').trim()
      const email = String(row.email || '').trim()
      const pwd = String(row.pwd || '').trim()
      const adresse = String(row.adresse || '').trim()
      const etat = String(row.etat || '').trim()

      ensureAllowedState(etat)

      if (!dateRaw || !nom || !email || !pwd || !adresse) {
        throw new Error('Champs requis manquants (nom/email/pwd/adresse)')
      }

      const dateAdd = normalizeOrderDateTime(dateRaw)
      if (!dateAdd) throw new Error('Date invalide (format attendu: JJ/MM/AAAA)')

      let customerId = null
      let secureKey = null

      const existingCustomer = await getCustomerByEmail(email)
      if (existingCustomer?.id) {
        customerId = existingCustomer.id
        secureKey = existingCustomer.secure_key
      } else {
        const createdCustomer = await createCustomer({
          firstname: nom,
          lastname: nom,
          email,
          passwd: pwd,
          active: true
        })

        customerId = createdCustomer?.prestashop?.customer?.id
        if (!customerId) throw new Error('Creation client echouee')
        results.customersCreated++

        const customerDetail = await getCustomerDetail(customerId)
        secureKey = customerDetail?.secure_key
      }

      if (!secureKey) throw new Error('secure_key client introuvable')

      const createdAddress = await createAddress({
        id_customer: customerId,
        alias: 'Adresse principale',
        firstname: nom,
        lastname: nom,
        address1: adresse,
        city: adresse
      })

      const addressId = createdAddress?.prestashop?.address?.id
      if (!addressId) throw new Error('Creation adresse echouee')
      results.addressesCreated++

      const achatItems = parseAchatItems(row.achat)
      const cartRows = []

      let totalProductsHt = 0
      let totalProductsWt = 0

      for (const item of achatItems) {
        const ref = String(item.reference || '').trim().toLowerCase()
        const qty = Number(item.quantity || 0)
        const variant = String(item.variant || '').trim().toLowerCase()

        if (!ref || !qty) continue

        const product = productMap.get(ref)
        if (!product) throw new Error(`Produit introuvable: ${item.reference}`)

        let combId = 0
        let priceImpact = 0
        if (variant) {
          const combinations = await getCombinationsCached(product.id)
          const targetRef = `${ref}-${variant}`
          const comb = combinations.find(c => String(c.reference || '').trim().toLowerCase() === targetRef)
          if (!comb) throw new Error(`Declinaison introuvable: ${item.reference}-${item.variant}`)
          combId = comb.id
          priceImpact = parsePriceValue(comb.price)
        }

        isPositif([
          { name: 'prix_produit', value: parsePriceValue(product.price) },
          { name: 'prix_declinaison', value: priceImpact }
        ], row.__line)

        cartRows.push({
          id_product: String(product.id),
          id_product_attribute: String(combId || 0),
          id_address_delivery: String(addressId),
          quantity: String(qty)
        })

        const baseHt = parsePriceValue(product.price) + priceImpact
        const rate = await getTaxRateForProduct(product)
        const unitTtc = getPriceTtcWithImpact(baseHt, rate, 0)
        totalProductsHt += baseHt * qty
        totalProductsWt += unitTtc * qty
      }

      if (!cartRows.length) throw new Error('Aucun achat valide pour ce client')

      const createdCart = await createCart({
        id_currency: DEFAULT_CURRENCY_ID,
        id_lang: 1,
        id_customer: customerId,
        id_address_delivery: addressId,
        id_address_invoice: addressId,
        cartRows
      })

      const cartId = createdCart?.prestashop?.cart?.id
      if (!cartId) throw new Error('Creation panier echouee')
      results.cartsCreated++

      // Keep cart date aligned with imported CSV date (same strategy as orders: PUT after create).
      await updateCartDates(cartId, dateAdd)

      if (!etat) {
        console.log(`L${row.__line} etat vide, seulement panier créé pour ${email}`);
      } else {
        console.log(`Creation de la commande pour ${email} avec l'etat ${etat}`);
        const paymentData = getPaymentFromLabel(etat)
        const targetState = getOrderStateIdFromLabel(etat)
        const orderRes = await createOrder({
          id_address_delivery: addressId,
          id_address_invoice: addressId,
          id_cart: cartId,
          id_currency: DEFAULT_CURRENCY_ID,
          id_lang: 1,
          id_customer: customerId,
          id_carrier: 1,
          secure_key: secureKey,
          module: paymentData.module,
          payment: paymentData.payment,
          total_paid: totalProductsWt.toFixed(6),
          total_paid_real: totalProductsWt.toFixed(6),
          total_products: totalProductsHt.toFixed(6),
          total_products_wt: totalProductsWt.toFixed(6),
          conversion_rate: 1,
          // Create order in a neutral state; stock side-effects are handled via history below.
          current_state: 13,
          // Stock side-effects will be handled by createOrderHistory below.
          skipStockSideEffects: true,
          // Allow annule orders to import even if stock is insufficient.
          skipStockCheck: targetState === 6
        })

        const orderId = orderRes?.prestashop?.order?.id
        if (!orderId) throw new Error('Creation commande echouee')
        results.ordersCreated++

        await createOrderHistory({
          id_order: orderId,
          id_order_state: targetState,
          id_employee: 1
        })

        await updateOrderDates(orderId, dateAdd)

        await getOrderDetail(orderId)
      }
    } catch (err) {
      const rowInfo = JSON.stringify(row)
      throw new Error(`Erreur ligne ${row.__line || i + 1} : ${err.message}. Ligne: ${rowInfo}`)
    }
  }

  return results
}

function normalizeOrderDateTime(value) {
  const raw = String(value || '').trim()
  if (!raw) return ''

  const frMatch = raw.match(/^([0-9]{2})\/([0-9]{2})\/([0-9]{4})$/)
  if (frMatch) {
    const [, day, month, year] = frMatch
    return `${year}-${month}-${day} 00:00:00`
  }

  const isoMatch = raw.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})$/)
  if (isoMatch) {
    return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]} 00:00:00`
  }

  const isoDateTime = raw.match(/^([0-9]{4})-([0-9]{2})-([0-9]{2})\s+([0-9]{2}):([0-9]{2}):([0-9]{2})$/)
  if (isoDateTime) return raw

  return ''
}