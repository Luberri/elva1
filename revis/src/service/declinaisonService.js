import { get, post, xmlToJson, jsonToXml } from '../api/util.js'
import { toLanguage, toText } from '../api/util.js'

// ==========================================
// MÉTHODES CRUD POUR PRODUCT OPTIONS (Groupes d'attributs)
// ==========================================

export async function createProductOption(data) {
  const optionObj = {
    is_color_group: data.is_color_group ? 1 : 0,
    group_type: data.group_type || 'select',
    position: data.position || 0,
    name: toLanguage(data.name),
    public_name: toLanguage(data.public_name || data.name)
  }

  const xmlRequest = jsonToXml({ prestashop: { product_option: optionObj } })

  const xmlResponse = await post({
    resource: 'product_options',
    body: xmlRequest
  })
  return xmlToJson(xmlResponse)
}

export async function getAllProductOptions() {
  const xml = await get({ resource: 'product_options' })
  const json = xmlToJson(xml)
  return json?.prestashop?.product_options?.product_option || []
}


// ==========================================
// MÉTHODES CRUD POUR PRODUCT OPTION VALUES (Valeurs d'attributs)
// ==========================================

export async function createProductOptionValue(data) {
  if (!data.id_attribute_group) throw new Error("id_attribute_group est requis pour créer une valeur d'attribut")

  const valueObj = {
    id_attribute_group: data.id_attribute_group,
    position: data.position || 0,
    name: toLanguage(data.name)
  }
  
  if (data.color) {
      valueObj.color = data.color
  }

  const xmlRequest = jsonToXml({ prestashop: { product_option_value: valueObj } })

  const xmlResponse = await post({
    resource: 'product_option_values',
    body: xmlRequest
  })
  return xmlToJson(xmlResponse)
}

export async function getAllProductOptionValues() {
  const xml = await get({ resource: 'product_option_values' })
  const json = xmlToJson(xml)
  return json?.prestashop?.product_option_values?.product_option_value || []
}


// ==========================================
// MÉTHODES CRUD POUR COMBINATIONS (Déclinaisons)
// ==========================================

export async function createCombination(data) {
  if (!data.id_product) throw new Error("id_product est requis pour créer une déclinaison")
  if (!data.product_option_value_ids || data.product_option_value_ids.length === 0) {
      throw new Error("Au moins une valeur d'attribut (product_option_value_ids) est requise")
  }

  const combinationObj = {
    id_product: data.id_product,
    reference: data.reference || '',
    price: data.price || 0, // Impact sur le prix
    weight: data.weight || 0,
    minimal_quantity: data.minimal_quantity || 1,
    quantity: data.quantity || 0, // Bien que souvent géré via stock_availables
    default_on: data.default_on ? 1 : 0
  }

  // Ajout des valeurs d'attributs via associations
  combinationObj.associations = {
    product_option_values: {
      product_option_value: data.product_option_value_ids.map(id => ({ id }))
    }
  }

  const xmlRequest = jsonToXml({ prestashop: { combination: combinationObj } })

  const xmlResponse = await post({
    resource: 'combinations',
    body: xmlRequest
  })
  return xmlToJson(xmlResponse)
}
