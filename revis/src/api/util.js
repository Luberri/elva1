// ==========================
// PRESTASHOP API CONFIG
// ==========================

import { XMLParser, XMLBuilder } from 'fast-xml-parser'
import axios from 'axios'

export const base_url = '/ps/api'
const prestashop_api_key = '0guZ5RivHuDCeVFCHq1zeygHBCAhHb10'
export const DEFAULT_CURRENCY_ID = 1
export const DEFAULT_COUNTRY_ID = 8
export const DEFAULT_CURRENCY_NAME = '€'

export function toLanguage(text, langId = 1) {
  return { language: { '@id': langId, '#text': text } }
}

export function toText(value) {
  if (value === undefined || value === null) return ''
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return toText(value[0])
  if (typeof value === 'object') {
    if ('language' in value) return toText(value.language)
    if ('#text' in value) return toText(value['#text'])
    if ('@id' in value) return toText(value['@id'])
    if ('id' in value) return toText(value.id)
  }
  return ''
}
// ==========================
// CONFIG FETCH
// ==========================
export function getPrestashopFetchConfig() {
  return {
    url: base_url.replace(/\/$/, ''),
    headers: {
      Accept: 'application/xml, text/xml;q=0.9, */*;q=0.8',
      Authorization: `Basic ${btoa(`${prestashop_api_key}:`)}`
    },
  }
}

// ==========================
// XML STRING → JSON
// ==========================
export function xmlToJson(xmlString) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    parseTagValue: true,
    parseAttributeValue: true,
    trimValues: true,
    isArray: (name, jpath, isLeafNode, isAttribute) => false, // let parseTagValue handle
  })

  try {
    return parser.parse(xmlString)
  } catch (e) {
    throw new Error(`XML invalide reçu depuis PrestaShop: ${e.message}`)
  }
}

// ==========================
// JSON → XML STRING
// ==========================
export function jsonToXml(jsonObj) {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    attributeNamePrefix: '@',
    format: true,
  })

  try {
    return builder.build(jsonObj)
  } catch (e) {
    throw new Error(`JSON invalide pour conversion XML: ${e.message}`)
  }
}

// ==========================
// API CALL
// ==========================

export async function get(params) {
  const { url: apiBaseUrl, headers: baseHeaders } = getPrestashopFetchConfig()

  let endpoint = ''
  let query = undefined
  let headers = undefined

  if (typeof params === 'string') {
    endpoint = params
  } else if (params && typeof params === 'object') {
    // Supported shapes:
    // - { endpoint: 'products/1' }
    // - { resource: 'products', id: 1 }
    // - { path: '/products/1' }
    endpoint = params.endpoint ?? params.path ?? ''
    if (!endpoint && params.resource) {
      endpoint = params.id !== undefined && params.id !== null && params.id !== ''
        ? `${params.resource}/${encodeURIComponent(String(params.id))}`
        : String(params.resource)
    }
    query = params.query
    headers = params.headers
  }

  if (!endpoint) throw new Error('get(params) : endpoint manquant')

  const cleanEndpoint = String(endpoint).replace(/^\/+/, '')
  const requestUrl = `${apiBaseUrl}/${cleanEndpoint}`

  const queryParams = {}
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue
      queryParams[key] = String(value)
    }
  }

  try {
    const fullUrl = buildQueryUrl(requestUrl, queryParams)
    console.log(`GET ${fullUrl}`)
    const response = await axios.get(fullUrl, {
      headers: {
        ...baseHeaders,
        ...(headers ?? {}),
      },
      responseType: 'text',
      transformResponse: [(data) => data],
    })

    return response.data
  } catch (error) {
    const status = error?.response?.status
    const statusText = error?.response?.statusText
    const message = error?.response?.data || error?.message || 'Erreur inconnue'
    throw new Error(`API error ${status ?? ''} ${statusText ?? ''}: ${message}`.trim())
  }
}

function buildQueryUrl(baseUrl, queryParams) {
  const entries = Object.entries(queryParams)
  if (!entries.length) return baseUrl

  const parts = entries.map(([key, value]) => {
    const encodedKey = encodeURIComponent(key).replace(/%5B/g, '[').replace(/%5D/g, ']')
    const encodedValue = encodeURIComponent(String(value))
      .replace(/%5B/g, '[')
      .replace(/%5D/g, ']')
      .replace(/%25/g, '%')
      .replace(/%2C/g, ',')
    return `${encodedKey}=${encodedValue}`
  })

  return `${baseUrl}?${parts.join('&')}`
}

export async function post(params) {
  const { url: apiBaseUrl, headers: baseHeaders } = getPrestashopFetchConfig()

  let endpoint = ''
  let query = undefined
  let headers = undefined
  let body = undefined

  if (params && typeof params === 'object') {
    endpoint = params.endpoint ?? params.path ?? ''
    if (!endpoint && params.resource) {
      endpoint = params.id !== undefined && params.id !== null && params.id !== ''
        ? `${params.resource}/${encodeURIComponent(String(params.id))}`
        : String(params.resource)
    }
    query = params.query
    headers = params.headers
    body = params.body
  }

  if (!endpoint) throw new Error('post(params) : endpoint manquant')

  const cleanEndpoint = String(endpoint).replace(/^\/+/, '')
  const requestUrl = `${apiBaseUrl}/${cleanEndpoint}`

  const queryParams = {}
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue
      queryParams[key] = String(value)
    }
  }

  try {
    const response = await axios.post(requestUrl, body, {
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/xml',
        ...(headers ?? {}),
      },
      params: queryParams,
      responseType: 'text',
      transformResponse: [(data) => data],
    })

    return response.data
  } catch (error) {
    const status = error?.response?.status
    const statusText = error?.response?.statusText
    const message = error?.response?.data || error?.message || 'Erreur inconnue'
    throw new Error(`API error ${status ?? ''} ${statusText ?? ''}: ${message}`.trim())
  }
}

export async function put(params) {
  const { url: apiBaseUrl, headers: baseHeaders } = getPrestashopFetchConfig()

  let endpoint = ''
  let query = undefined
  let headers = undefined
  let body = undefined

  if (params && typeof params === 'object') {
    endpoint = params.endpoint ?? params.path ?? ''
    if (!endpoint && params.resource) {
      endpoint = params.id !== undefined && params.id !== null && params.id !== ''
        ? `${params.resource}/${encodeURIComponent(String(params.id))}`
        : String(params.resource)
    }
    query = params.query
    headers = params.headers
    body = params.body
  }

  if (!endpoint) throw new Error('put(params) : endpoint manquant')

  const cleanEndpoint = String(endpoint).replace(/^\/+/, '')
  const requestUrl = `${apiBaseUrl}/${cleanEndpoint}`

  const queryParams = {}
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue
      queryParams[key] = String(value)
    }
  }

  try {
    console.log(`PUT ${requestUrl} - body:`)
    console.log(body)
    const response = await axios.put(requestUrl, body, {
      headers: {
        ...baseHeaders,
        'Content-Type': 'application/xml',
        ...(headers ?? {}),
      },
      params: queryParams,
      responseType: 'text',
      transformResponse: [(data) => data],
    })

    return response.data
  } catch (error) {
    const status = error?.response?.status
    const statusText = error?.response?.statusText
    const message = error?.response?.data || error?.message || 'Erreur inconnue'
    throw new Error(`API error ${status ?? ''} ${statusText ?? ''}: ${message}`.trim())
  }
}

export async function del(params) {
  const { url: apiBaseUrl, headers: baseHeaders } = getPrestashopFetchConfig()

  let endpoint = ''
  let query = undefined
  let headers = undefined

  if (typeof params === 'string') {
    endpoint = params
  } else if (params && typeof params === 'object') {
    endpoint = params.endpoint ?? params.path ?? ''
    if (!endpoint && params.resource) {
      endpoint = params.id !== undefined && params.id !== null && params.id !== ''
        ? `${params.resource}/${encodeURIComponent(String(params.id))}`
        : String(params.resource)
    }
    query = params.query
    headers = params.headers
  }

  if (!endpoint) throw new Error('del(params) : endpoint manquant')

  const cleanEndpoint = String(endpoint).replace(/^\/+/, '')
  const requestUrl = `${apiBaseUrl}/${cleanEndpoint}`

  const queryParams = {}
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue
      queryParams[key] = String(value)
    }
  }

  try {
    const response = await axios.delete(requestUrl, {
      headers: {
        ...baseHeaders,
        ...(headers ?? {}),
      },
      params: queryParams,
      responseType: 'text',
      transformResponse: [(data) => data],
    })

    return response.data
  } catch (error) {
    const status = error?.response?.status
    const statusText = error?.response?.statusText
    const message = error?.response?.data || error?.message || 'Erreur inconnue'
    throw new Error(`API error ${status ?? ''} ${statusText ?? ''}: ${message}`.trim())
  }
}
