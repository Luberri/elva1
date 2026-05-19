import { get, post, xmlToJson, jsonToXml } from '../api/util.js'
import { toLanguage } from '../api/util.js'
import { createStock } from './stockService.js'
import { createStockAv, getAllStocks as getAllStockAvailables, updateStockAv } from './stockAvailableService.js'

async function ensureStockAvailableForCombination({
  id_product,
  id_product_attribute,
  quantity,
  depends_on_stock,
  out_of_stock,
  id_shop,
  id_shop_group
}) {
  const list = await getAllStockAvailables({
    filters: {
      id_product: String(id_product),
      id_product_attribute: String(id_product_attribute)
    },
    display: 'full'
  })

  const existing = Array.isArray(list) && list.length ? list[0] : null
  if (existing?.id) {
    await updateStockAv(existing.id, {
      id_product: String(id_product),
      id_product_attribute: String(id_product_attribute),
      quantity: quantity ?? 0,
      depends_on_stock: 0,
      out_of_stock: out_of_stock !== undefined ? out_of_stock : (existing?.out_of_stock ?? 2),
      id_shop: existing?.id_shop || id_shop || '1',
      id_shop_group: existing?.id_shop_group || id_shop_group || '1',
      location: existing?.location
    })
    return existing
  }

  const created = await createStockAv({
    id_product: String(id_product),
    id_product_attribute: String(id_product_attribute),
    quantity: quantity ?? 0,
    depends_on_stock: 0,
    out_of_stock: out_of_stock !== undefined ? out_of_stock : 2,
    id_shop: id_shop || '1',
    id_shop_group: id_shop_group || '1'
  })

  return created
}

// ==========================================
// PRODUCT OPTIONS (groupes d'attributs)
// ==========================================

export async function createProductOption(data) {
  if (!data.name) throw new Error("name requis pour product option")

  const optionObj = {
    is_color_group: data.is_color_group ? 1 : 0,
    group_type: data.group_type || 'select',
    position: data.position ?? 0,
    name: toLanguage(data.name),
    public_name: toLanguage(data.public_name || data.name)
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      product_option: optionObj
    }
  })

  const xmlResponse = await post({
    resource: 'product_options',
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function getAllProductOptions() {
  const xml = await get({
    resource: 'product_options',
    query: { display: 'full' }
  })

  const json = xmlToJson(xml)
  const data = json?.prestashop?.product_options?.product_option

  if (!data) return []
  return Array.isArray(data) ? data : [data]
}

// ==========================================
// PRODUCT OPTION VALUES (valeurs attributs)
// ==========================================

export async function createProductOptionValue(data) {
  if (!data.id_attribute_group) {
    throw new Error("id_attribute_group requis")
  }

  const valueObj = {
    id_attribute_group: data.id_attribute_group,
    position: data.position ?? 0,
    name: toLanguage(data.name)
  }

  if (data.color) {
    valueObj.color = data.color
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      product_option_value: valueObj
    }
  })

  const xmlResponse = await post({
    resource: 'product_option_values',
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function getAllProductOptionValues() {
  const xml = await get({
    resource: 'product_option_values',
    query: { display: 'full' }
  })

  const json = xmlToJson(xml)
  const data = json?.prestashop?.product_option_values?.product_option_value

  if (!data) return []
  return Array.isArray(data) ? data : [data]
}

// ==========================================
// COMBINATIONS (déclinaisons)
// ==========================================

export async function createCombination(data) {
  if (!data.id_product) {
    throw new Error("id_product requis")
  }

  if (!data.product_option_value_ids?.length) {
    throw new Error("product_option_value_ids requis")
  }

  const combinationObj = {
    id_product: data.id_product,
    reference: data.reference || '',
    price: data.price ?? 0,
    weight: data.weight ?? 0,
    wholesale_price: data.wholesale_price ?? 0,
    minimal_quantity: data.minimal_quantity ?? 1,
    default_on: data.default_on ? 1 : 0
  }

  // ⚠️ IMPORTANT: ne PAS mettre quantity ici (PrestaShop ignore ou casse parfois)
  // stock géré via stock_availables / stocks

  combinationObj.associations = {
    product_option_values: {
      product_option_value: data.product_option_value_ids.map(id => ({
        id: String(id)
      }))
    }
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      combination: combinationObj
    }
  })

  const xmlResponse = await post({
    resource: 'combinations',
    body: xmlRequest
  })

  const response = xmlToJson(xmlResponse)
  const id_product_attribute = response?.prestashop?.combination?.id

  // IMPORTANT: s'assurer que stock_available existe pour la déclinaison et que la quantité est bien renseignée
  if (id_product_attribute) {
    try {
      await ensureStockAvailableForCombination({
        id_product: data.id_product,
        id_product_attribute,
        quantity: data.quantity ?? 0,
        // Par défaut, on dépend du stock physique (cohérent avec stocks + stock_movements)
        depends_on_stock: data.depends_on_stock !== undefined ? data.depends_on_stock : 1,
        out_of_stock: data.out_of_stock,
        id_shop: data.id_shop,
        id_shop_group: data.id_shop_group
      })
    } catch (e) {
      console.error('Erreur création/màj stock_available pour déclinaison:', e?.message || e)
    }
  }

  // Création du stock physique si demandé
  if (id_product_attribute && data.createStock) {
    await createStock({
      id_warehouse: data.id_warehouse ?? 1,
      id_product: data.id_product,
      id_product_attribute,
      physical_quantity: data.quantity ?? 0,
      usable_quantity: data.quantity ?? 0,
      price_te: data.price ?? 0,
      reference: data.reference || ''
    })
  }

  return response
}