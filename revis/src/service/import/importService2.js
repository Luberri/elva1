import Papa from 'papaparse'
import { get, xmlToJson, toText, isPositif } from '../../api/util.js'
import { getAllProducts, hasCombination } from '../productService.js'
import {
  getAllProductOptions,
  createProductOption,
  getAllProductOptionValues,
  createProductOptionValue,
  createCombination
} from '../declinaisonService.js'

import { updateStockAv, getStockDetail } from '../stockAvailableService.js'
import { createStock } from '../stockService.js'
import { getTaxRateForGroup } from '../taxeService.js'
import { createStockMvt } from '../stockMvtService.js'

/* =========================
   SAFE NORMALIZER (IMPORTANT)
========================= */
function normalizeText(value) {
  if (value === undefined || value === null) return ''

  if (typeof value === 'string') return value.trim()

  if (typeof value === 'number') return String(value).trim()

  if (Array.isArray(value)) {
    return value.length ? normalizeText(value[0]) : ''
  }

  if (typeof value === 'object') {
    if (value['#text']) return String(value['#text']).trim()
    if (value._) return String(value._).trim()
    if (value.language) return normalizeText(value.language)
  }

  return String(value).trim()
}

function parseNumber(str) {
  if (!str) return 0
  return parseFloat(String(str).replace('%', '').replace(',', '.').trim()) || 0
}

const DEFAULT_WAREHOUSE_ID = 1

/* =========================
   IMPORT CSV
========================= */
export async function importDataFromCSV2(csvText) {

  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true
  })

  const requiredColumns = [
    'reference',
    'specificité',
    'karazany',
    'stock_initial',
    'prix_vente_ttc'
  ]

  const fieldSet = new Set(parsed?.meta?.fields || [])
  const missingColumns = requiredColumns.filter(c => !fieldSet.has(c))

  if (missingColumns.length) {
    throw new Error(`Colonnes manquantes: ${missingColumns.join(', ')}`)
  }

  const records = parsed.data

  if (!records.length) {
    throw new Error("CSV vide ou invalide")
  }

  const results = {
    combinationsCreated: 0,
    stocksUpdated: 0,
    errors: []
  }

  /* =========================
     TAX CACHE
  ========================= */
  const taxRateMap = new Map()

  async function getTaxRateForProduct(prod) {
    const groupId = String(prod?.id_tax_rules_group || '0')

    if (taxRateMap.has(groupId)) {
      return taxRateMap.get(groupId)
    }

    const rate = await getTaxRateForGroup(groupId)

    taxRateMap.set(groupId, rate || 0)

    return rate || 0
  }

  /* =========================
     PRODUCTS MAP
  ========================= */
  const products = await getAllProducts()

  const productMap = new Map()

  products.forEach(p => {
    if (p.reference) {
      productMap.set(p.reference.trim(), p)
    }
  })

  /* =========================
     OPTIONS MAP
  ========================= */
  const existingOptions = await getAllProductOptions()
  const optionMap = new Map()

  existingOptions.forEach(opt => {
    const name = normalizeText(opt.name)

    if (name) {
      optionMap.set(name.toLowerCase(), opt.id || opt['@id'])
    }
  })

  /* =========================
     OPTION VALUES MAP
  ========================= */
  const existingValues = await getAllProductOptionValues()
  const optionValueMap = new Map()

  existingValues.forEach(val => {
    const name = normalizeText(val.name)
    const groupId = normalizeText(val.id_attribute_group)

    if (name && groupId) {
      optionValueMap.set(
        `${groupId}-${name.toLowerCase()}`,
        val.id || val['@id']
      )
    }
  })

  /* =========================
     MAIN LOOP
  ========================= */
  for (let i = 0; i < records.length; i++) {

    const row = records[i]

    if (!row.reference) continue

    const reference = normalizeText(row.reference)
    const specificite = normalizeText(row['specificité'])
    const karazany = normalizeText(row.karazany)

    const stock_initial = parseInt(row.stock_initial, 10) || 0
    const prix_vente_ttc = parseNumber(row.prix_vente_ttc)

    isPositif([
      { name: 'prix_vente_ttc', value: prix_vente_ttc }
    ], i + 1)

    try {

      const product = productMap.get(reference)

      if (!product) {
        throw new Error(`Produit introuvable: ${reference}`)
      }

      const id_product = product.id

      let id_product_attribute = 0

      console.log(`Produit ${id_product} - ${reference}`)

      /* =========================
         DECLINAISON
      ========================= */
      if (specificite && karazany) {

        const specKey = specificite.toLowerCase()

        let optionId = optionMap.get(specKey)

        if (!optionId) {
          const newOpt = await createProductOption({
            name: specificite,
            group_type: 'select',
            is_color_group: specificite.toLowerCase() === 'couleur'
          })

          optionId = newOpt?.prestashop?.product_option?.id

          if (optionId) {
            optionMap.set(specKey, optionId)
          }
        }

        const valKey = `${optionId}-${karazany.toLowerCase()}`

        let optionValueId = optionValueMap.get(valKey)

        if (!optionValueId) {
          const newVal = await createProductOptionValue({
            id_attribute_group: optionId,
            name: karazany
          })

          optionValueId = newVal?.prestashop?.product_option_value?.id

          if (optionValueId) {
            optionValueMap.set(valKey, optionValueId)
          }
        }

        /* =========================
           PRICE IMPACT
        ========================= */
        let priceImpact = 0

        if (prix_vente_ttc > 0 && product.price) {
          isPositif([
            { name: 'prix_vente_ttc', value: prix_vente_ttc },
            { name: 'prix_produit', value: parseNumber(product.price) }
          ], i + 1)

          const baseHt = parseNumber(product.price)
          const taxRate = await getTaxRateForProduct(product)

          const baseTtc = baseHt * (1 + taxRate / 100)
          const diffTtc = prix_vente_ttc - baseTtc

          priceImpact = taxRate > 0
            ? diffTtc / (1 + taxRate / 100)
            : diffTtc

          priceImpact = Number(priceImpact.toFixed(6))
        }

        /* =========================
           CREATE COMBINATION
        ========================= */
        const comb = await createCombination({
          id_product,
          product_option_value_ids: [optionValueId],
          reference: `${reference}-${karazany}`,
          quantity: stock_initial,
          price: priceImpact,
          wholesale_price: product?.wholesale_price ?? 0,
          minimal_quantity: 1,
          default_on: false,
          createStock: true,
          id_warehouse: DEFAULT_WAREHOUSE_ID
        })

        id_product_attribute = comb?.prestashop?.combination?.id

        if (id_product_attribute) {
          results.combinationsCreated++
        }
      }

      /* =========================
         STOCK AVAILABLE SYNC
      ========================= */
      const productXml = await get({ resource: 'products', id: id_product })
      const productJson = xmlToJson(productXml)

      const stocks =
        productJson?.prestashop?.product?.associations?.stock_availables?.stock_available

      let stockId = null

      if (stocks) {
        const list = Array.isArray(stocks) ? stocks : [stocks]

        for (const s of list) {
          const attr = toText(s.id_product_attribute) || '0'

          if (String(attr) === String(id_product_attribute)) {
            stockId = toText(s.id)
            break
          }
        }
      }

      if (stockId) {

        const realStock = await getStockDetail(stockId)

        await updateStockAv(stockId, {
          id_product,
          id_product_attribute,
          quantity: stock_initial,
          depends_on_stock: realStock?.depends_on_stock || 0,
          out_of_stock: realStock?.out_of_stock || 2,
          id_shop: realStock?.id_shop || 1,
          id_shop_group: realStock?.id_shop_group || 0,
          product_name: product?.name || '',
          reference: product?.reference || ''
        })

        results.stocksUpdated++

      } else {
        results.errors.push(
          `Stock introuvable pour ${reference} attr ${id_product_attribute}`
        )
      }

      /* =========================
         SIMPLE STOCK (no combination)
      ========================= */
      const hasDeclinaison = await hasCombination(id_product)

      if (!hasDeclinaison && stock_initial > 0) {

        await createStock({
          id_product,
          id_product_attribute: 0,
          id_warehouse: DEFAULT_WAREHOUSE_ID,
          physical_quantity: stock_initial,
          usable_quantity: stock_initial,
          price_te: product?.wholesale_price ?? 0,
          id_employee: 1,
          id_stock_mvt_reason: 1,
          product_name: product?.name || '',
          reference: product?.reference || ''
        })

        console.log(`Stock créé pour ${reference}: ${stock_initial}`)
      }

    } catch (err) {
      results.errors.push(
        `Erreur ligne ${i + 1} (${reference}) : ${err.message}`
      )
    }
  }

  return results
}