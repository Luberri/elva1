import { get, post, put, del, xmlToJson, jsonToXml, toLanguage, toText } from '../api/util.js'
export function formatProductData(product) {
  if (!product) return null
  
  // Extraire les IDs de toutes les images
  let imageIds = []
  const imgsNode = product.associations?.images?.image
  if (imgsNode) {
    const list = Array.isArray(imgsNode) ? imgsNode : [imgsNode]
    imageIds = list.map(img => toText(img?.id)).filter(id => id)
  }

  let stockAvailableId = null
  const stockNode = product.associations?.stock_availables?.stock_available
  if (stockNode) {
    const list = Array.isArray(stockNode) ? stockNode : [stockNode]
    stockAvailableId = toText(list[0]?.id)
  }

  return {
    id: String(product.id || ''),
    titre: toText(product.name),
    reference: product.reference ?? '',
    categorieId: toText(product.id_category_default),
    id_tax_rules_group: toText(product.id_tax_rules_group),
    image: product.id_default_image?.['@xlink:href'] || '',
    images: imageIds, // Liste de tous les IDs d'images
    stockAvailableId: stockAvailableId, // ID du stock disponible
    description: toText(product.description),
    descriptionShort: toText(product.description_short),
    price: product.price || '',
    wholesale_price: product.wholesale_price || '',
    quantity_discount: product.quantity_discount || '0',
    state: product.state || '',
    available_date: toText(product.available_date),
  }
}

export function parsePriceValue(value) {
  const num = parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(num) ? num : 0
}

export function getPriceTtcWithImpact(basePriceHt, taxRate, priceImpactHt = 0) {
  const base = parsePriceValue(basePriceHt)
  const impact = parsePriceValue(priceImpactHt)
  const rate = parsePriceValue(taxRate)
  const totalHt = base + impact
  return totalHt * (1 + rate / 100)
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

export async function apiProduct(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID product manquant')
  const xml = await get({ resource: 'products', id })
  return xmlToJson(xml)
}

export async function apiProducts(options = {}) {
  const xml = await get({ resource: 'products', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function getProductDetail(id) {
  const detail = await apiProduct(id)
  const prod = detail?.prestashop?.product ?? null
  return formatProductData(prod)
}

export async function getAllProducts(options = {}) {
  const data = await apiProducts(options)
  const productsNode = data?.prestashop?.products?.product
  
  if (!productsNode) {
    return []
  }

  const list = Array.isArray(productsNode) ? productsNode : [productsNode]
  return list.map(item => formatProductData(item)).filter(r => r !== null)
}

export async function deleteProduct(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID product manquant')
  const xml = await del({ resource: 'products', id })
  return xmlToJson(xml)
}

export async function createProduct(data) {
  const productObj = {
    state: 1, // État toujours requis à 1 par défaut
    active: data.active ? 1 : 0,
    indexed: 1,
    visibility: 'both',
    price: data.price || 0,
    id_category_default: data.id_category_default || 2, // 2 = Accueil généralement
    reference: data.reference || '',
    name: toLanguage(data.name || 'Nouveau Produit'),
    link_rewrite: toLanguage(
      (data.name || 'nouveau-produit').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'produit'
    ),
    description: toLanguage(data.description || ''),
    show_price: 1,
    available_for_order: 1
  }

  if (data.id_manufacturer) productObj.id_manufacturer = data.id_manufacturer
  if (data.id_supplier) productObj.id_supplier = data.id_supplier
  if (data.wholesale_price) productObj.wholesale_price = data.wholesale_price
  if (data.id_tax_rules_group) productObj.id_tax_rules_group = data.id_tax_rules_group
  if (data.available_date) productObj.available_date = data.available_date

  // Pour correctement lier la catégorie dans PrestaShop, il faut souvent l'ajouter dans les associations
  if (data.id_category_default) {
    productObj.associations = {
      categories: {
        category: {
          id: data.id_category_default
        }
      }
    }
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      product: productObj
    }
  })

  const xmlResponse = await post({
    resource: 'products',
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function updateProduct(id, data) {
  if (id === undefined || id === null || id === '') throw new Error('ID product manquant pour la modification')

  const productObj = {
    id: id,
    state: 1,
    active: data.active ? 1 : 0,
    price: data.price || 0,
    id_category_default: data.categorieId || 2,
    reference: data.reference || '',
    name: toLanguage(data.titre || 'Produit modifié'),
    link_rewrite: toLanguage(
      (data.titre || 'produit-modifie').toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'produit'
    ),
    description: toLanguage(data.description || ''),
    description_short: toLanguage(data.descriptionShort || ''),
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      product: productObj
    }
  })

  const xmlResponse = await put({
    resource: 'products',
    id: id,
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}
