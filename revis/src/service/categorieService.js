import { get, post, del, xmlToJson, jsonToXml } from '../api/util.js'
import { toLanguage,toText } from '../api/util.js'

function slugify(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

export function getSubCategories(category) {
  const categoriesNode = category?.associations?.categories?.category
  if (!categoriesNode) return []
  
  const list = Array.isArray(categoriesNode) ? categoriesNode : [categoriesNode]
  return list.map(item => toText(item?.id)).filter(id => id !== '')
}

export function formatCategoryData(category) {
  if (!category) return null
  return {
    id: String(category.id || ''),
    id_parent: toText(category.id_parent),
    level_depth: toText(category.level_depth),
    active: toText(category.active),
    name: toText(category.name),
    link_rewrite: toText(category.link_rewrite),
    description: toText(category.description),
    position: toText(category.position),
    subcategories: getSubCategories(category)
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

export async function apiCategorie(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID catégorie manquant')
  const xml = await get({ resource: 'categories', id })
  return xmlToJson(xml)
}

export async function apiCategories(options = {}) {
  const xml = await get({ resource: 'categories', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function getCategory(categoryId) {
  const id = toText(categoryId)
  if (!id) return null

  try {
    const categoryData = await apiCategorie(id)
    const category = categoryData?.prestashop?.category ?? null
    return formatCategoryData(category)
  } catch {
    return null
  }
}

export async function getAllCategories(options = {}) {
  const data = await apiCategories(options)
  const categoriesNode = data?.prestashop?.categories?.category
  
  if (!categoriesNode) {
    return []
  }

  const list = Array.isArray(categoriesNode) ? categoriesNode : [categoriesNode]
  return list.map(item => formatCategoryData(item)).filter(r => r !== null)
}

export async function createCategory(data) {
  const linkRewrite = data.link_rewrite || slugify(data.name || 'nouvelle-categorie')
  const categoryObj = {
    active: data.active ? 1 : 0,
    name: toLanguage(data.name),
    link_rewrite: toLanguage(linkRewrite),
    id_parent: data.id_parent || 1
  }

  if (data.id_shop_default) categoryObj.id_shop_default = data.id_shop_default
  if (data.is_root_category !== undefined) categoryObj.is_root_category = data.is_root_category ? 1 : 0
  if (data.position !== undefined && data.position !== '') categoryObj.position = data.position
  
  if (data.description) categoryObj.description = toLanguage(data.description)
  if (data.meta_title) categoryObj.meta_title = toLanguage(data.meta_title)
  if (data.meta_description) categoryObj.meta_description = toLanguage(data.meta_description)
  if (data.meta_keywords) categoryObj.meta_keywords = toLanguage(data.meta_keywords)

  const jsonObj = {
    prestashop: {
      category: categoryObj
    }
  }

  const xmlBody = jsonToXml(jsonObj)
  const responseXml = await post({
    resource: 'categories',
    body: xmlBody
  })
  
  return xmlToJson(responseXml)
}

export async function deleteCategory(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID catégorie manquant')
  const xml = await del({ resource: 'categories', id })
  return xmlToJson(xml)
}
