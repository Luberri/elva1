import { get, del, xmlToJson } from '../api/util.js'
import { toText } from '../api/util.js'

/**
 * Mapping PrestaShop API resource -> XML node réel
 */
const RESOURCE_MAP = {
  stock_movements: 'stock_mvts',
  stock_movement: 'stock_mvts',
  stocks: 'stock_availables',
}

/**
 * Fonction générique pour supprimer tous les éléments d'une ressource PrestaShop
 * @param {string} resource Le nom de la ressource api (ex: 'products', 'categories')
 */
export async function deleteAllForResource(resource) {
  try {
    const nodeKey = RESOURCE_MAP[resource] || resource

    console.log('\n==============================')
    console.log(`[REQ] GET resource = ${resource}`)
    console.log(`[NODE] XML key = ${nodeKey}`)
    console.log('==============================\n')

    const xmlData = await get({ resource })

    console.log('\n========== RAW XML RESPONSE ==========')
    console.log(xmlData)
    console.log('======================================\n')

    const jsonData = xmlToJson(xmlData)

    console.log('\n========== PARSED JSON ==========')
    console.log(JSON.stringify(jsonData, null, 2))
    console.log('================================\n')

    const resourceNode =
      jsonData?.prestashop?.[nodeKey] ||
      jsonData?.prestashop?.[resource]

    console.log('\n========== RESOURCE NODE ========== ')
    console.log(resourceNode)
    console.log('===================================\n')

    if (!resourceNode) {
      console.log(`[INFO] resourceNode introuvable pour: ${resource}`)
      return 0
    }

    let items = []

    for (const key in resourceNode) {
      if (key.startsWith('@')) continue

      const val = resourceNode[key]

      if (Array.isArray(val)) {
        console.log(`[INFO] Array détecté dans key = ${key}`)
        items = val
        break
      }

      if (typeof val === 'object' && val !== null) {
        console.log(`[INFO] Object détecté dans key = ${key}`)
        items = [val]
        break
      }
    }

    console.log('\n========== ITEMS ========== ')
    console.log(items)
    console.log('===========================\n')

    if (items.length === 0) {
      console.log('[INFO] Aucun item trouvé')
      return 0
    }

    const ids = items
      .map(item => toText(item?.['@id'] || item?.id))
      .filter(id => id !== '')

    console.log('\n========== IDS ========== ')
    console.log(ids)
    console.log('=========================\n')

    let deletedCount = 0

    for (const id of ids) {
      try {
        console.log(`[DELETE] ${resource} ID=${id}`)

        if (resource === 'customers' && id === ids[0]) {
          console.log(`[SKIP] premier customer ignoré`)
        } else {
          await del({ resource, id })
        }

        deletedCount++
      } catch (err) {
        console.error(`[ERROR DELETE] ${resource} ID=${id}`, err.message)
      }
    }

    console.log(`\n[RESULT] deletedCount = ${deletedCount}\n`)
    return deletedCount

  } catch (error) {
    console.error(`[FATAL ERROR] resource=${resource}`, error.message)
    return 0
  }
}

/**
 * Supprime absolument TOUTES les données en fonction de la liste demandée.
 * Attention : Cette opération est irréversible !
 */
export async function resetAllData() {
  const reports = {}

  const resourcesToDelete = [
    'order_details',
    'order_histories',
    'order_invoices',
    'order_payments',
    'order_carriers',
    'orders',

    'carts',
    'cart_rules',
    'specific_price_rules',
    'specific_prices',

    'stock_movements',
    'stocks',
    'stock_availables',

    'products',

    'images/products',
    'images/categories',

    'categories',

    'tax_rules',
    'tax_rule_groups',
    'taxes',

    'addresses',
    'guests',
    'customers',
    'groups'
  ]

  for (const resource of resourcesToDelete) {
    try {
      const count = await deleteAllForResource(resource)
      reports[resource] = count
      console.log(`[RESET] ${count} supprimés pour la ressource: ${resource}`)
    } catch (e) {
      reports[resource] = `Erreur: ${e.message}`
    }
  }

  return reports
}