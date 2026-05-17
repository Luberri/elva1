import { get, post, put, del, xmlToJson, jsonToXml, toText } from '../api/util.js'

function parseDelay(delayNode) {
  const languages = delayNode?.language
  if (!languages) return []
  const list = Array.isArray(languages) ? languages : [languages]
  return list
    .map((item) => ({
      id: toText(item?.['@id'] || item?.id),
      value: toText(item)
    }))
    .filter((item) => item.id || item.value)
}

function buildDelayLanguages(delay, defaultLangId = 1) {
  if (delay === undefined || delay === null || delay === '') return undefined

  if (Array.isArray(delay)) {
    const languages = delay
      .map((item) => {
        if (!item) return null
        const id = item.id ?? item.langId ?? item.language_id ?? item.languageId ?? defaultLangId
        const text = item.text ?? item.value ?? ''
        return { '@id': Number(id), '#text': String(text) }
      })
      .filter(Boolean)

    if (!languages.length) return undefined
    return { language: languages }
  }

  if (typeof delay === 'object') {
    const languages = Object.entries(delay).map(([id, text]) => ({
      '@id': Number(id || defaultLangId),
      '#text': String(text ?? '')
    }))

    if (!languages.length) return undefined
    return { language: languages }
  }

  return { language: { '@id': Number(defaultLangId), '#text': String(delay) } }
}

function setIfDefined(obj, key, value) {
  if (value === undefined || value === null || value === '') return
  obj[key] = value
}

export function formatCarrierData(carrier) {
  if (!carrier) return null
  return {
    id: String(carrier.id || ''),
    deleted: toText(carrier.deleted),
    is_module: toText(carrier.is_module),
    id_tax_rules_group: toText(carrier.id_tax_rules_group),
    id_reference: toText(carrier.id_reference),
    name: toText(carrier.name),
    active: toText(carrier.active),
    is_free: toText(carrier.is_free),
    url: toText(carrier.url),
    shipping_handling: toText(carrier.shipping_handling),
    shipping_external: toText(carrier.shipping_external),
    range_behavior: toText(carrier.range_behavior),
    shipping_method: toText(carrier.shipping_method),
    max_width: toText(carrier.max_width),
    max_height: toText(carrier.max_height),
    max_depth: toText(carrier.max_depth),
    max_weight: toText(carrier.max_weight),
    grade: toText(carrier.grade),
    external_module_name: toText(carrier.external_module_name),
    need_range: toText(carrier.need_range),
    position: toText(carrier.position),
    delay: parseDelay(carrier.delay)
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

export async function apiCarrier(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID carrier manquant')
  const xml = await get({ resource: 'carriers', id })
  return xmlToJson(xml)
}

export async function apiCarriers(options = {}) {
  const xml = await get({ resource: 'carriers', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function getCarrierDetail(id) {
  const detail = await apiCarrier(id)
  const carrier = detail?.prestashop?.carrier ?? null
  return formatCarrierData(carrier)
}

export async function getAllCarriers(options = {}) {
  const data = await apiCarriers(options)
  const carriersNode = data?.prestashop?.carriers?.carrier

  if (!carriersNode) {
    return []
  }

  const list = Array.isArray(carriersNode) ? carriersNode : [carriersNode]

  return list.map(item => formatCarrierData(item)).filter(r => r !== null)
}

export async function deleteCarrier(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID carrier manquant')
  const xml = await del({ resource: 'carriers', id })
  return xmlToJson(xml)
}

export async function createCarrier(data) {
  const carrierObj = {}

  setIfDefined(carrierObj, 'deleted', data.deleted)
  setIfDefined(carrierObj, 'is_module', data.is_module)
  setIfDefined(carrierObj, 'id_tax_rules_group', data.id_tax_rules_group)
  setIfDefined(carrierObj, 'id_reference', data.id_reference)
  setIfDefined(carrierObj, 'name', data.name)
  setIfDefined(carrierObj, 'active', data.active)
  setIfDefined(carrierObj, 'is_free', data.is_free)
  setIfDefined(carrierObj, 'url', data.url)
  setIfDefined(carrierObj, 'shipping_handling', data.shipping_handling)
  setIfDefined(carrierObj, 'shipping_external', data.shipping_external)
  setIfDefined(carrierObj, 'range_behavior', data.range_behavior)
  setIfDefined(carrierObj, 'shipping_method', data.shipping_method)
  setIfDefined(carrierObj, 'max_width', data.max_width)
  setIfDefined(carrierObj, 'max_height', data.max_height)
  setIfDefined(carrierObj, 'max_depth', data.max_depth)
  setIfDefined(carrierObj, 'max_weight', data.max_weight)
  setIfDefined(carrierObj, 'grade', data.grade)
  setIfDefined(carrierObj, 'external_module_name', data.external_module_name)
  setIfDefined(carrierObj, 'need_range', data.need_range)
  setIfDefined(carrierObj, 'position', data.position)

  const delayNode = buildDelayLanguages(data.delay, data.delay_lang_id ?? 1)
  if (delayNode) carrierObj.delay = delayNode

  const xmlRequest = jsonToXml({
    prestashop: {
      carrier: carrierObj
    }
  })

  const xmlResponse = await post({
    resource: 'carriers',
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function updateCarrier(id, data) {
  if (id === undefined || id === null || id === '') throw new Error('ID carrier manquant pour la modification')

  const carrierObj = { id }

  setIfDefined(carrierObj, 'deleted', data.deleted)
  setIfDefined(carrierObj, 'is_module', data.is_module)
  setIfDefined(carrierObj, 'id_tax_rules_group', data.id_tax_rules_group)
  setIfDefined(carrierObj, 'id_reference', data.id_reference)
  setIfDefined(carrierObj, 'name', data.name)
  setIfDefined(carrierObj, 'active', data.active)
  setIfDefined(carrierObj, 'is_free', data.is_free)
  setIfDefined(carrierObj, 'url', data.url)
  setIfDefined(carrierObj, 'shipping_handling', data.shipping_handling)
  setIfDefined(carrierObj, 'shipping_external', data.shipping_external)
  setIfDefined(carrierObj, 'range_behavior', data.range_behavior)
  setIfDefined(carrierObj, 'shipping_method', data.shipping_method)
  setIfDefined(carrierObj, 'max_width', data.max_width)
  setIfDefined(carrierObj, 'max_height', data.max_height)
  setIfDefined(carrierObj, 'max_depth', data.max_depth)
  setIfDefined(carrierObj, 'max_weight', data.max_weight)
  setIfDefined(carrierObj, 'grade', data.grade)
  setIfDefined(carrierObj, 'external_module_name', data.external_module_name)
  setIfDefined(carrierObj, 'need_range', data.need_range)
  setIfDefined(carrierObj, 'position', data.position)

  const delayNode = buildDelayLanguages(data.delay, data.delay_lang_id ?? 1)
  if (delayNode) carrierObj.delay = delayNode

  const xmlRequest = jsonToXml({
    prestashop: {
      carrier: carrierObj
    }
  })

  const xmlResponse = await put({
    resource: 'carriers',
    id,
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}
