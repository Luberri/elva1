import { get, post, put, del, xmlToJson, jsonToXml, toText, DEFAULT_COUNTRY_ID } from '../api/util.js'

export function formatAddressData(address) {
  if (!address) return null
  return {
    id: String(address.id || ''),
    id_customer: toText(address.id_customer),
    id_manufacturer: toText(address.id_manufacturer),
    id_supplier: toText(address.id_supplier),
    id_warehouse: toText(address.id_warehouse),
    id_country: toText(address.id_country),
    id_state: toText(address.id_state),
    alias: toText(address.alias),
    company: toText(address.company),
    lastname: toText(address.lastname),
    firstname: toText(address.firstname),
    vat_number: toText(address.vat_number),
    address1: toText(address.address1),
    address2: toText(address.address2),
    postcode: toText(address.postcode),
    city: toText(address.city),
    other: toText(address.other),
    phone: toText(address.phone),
    phone_mobile: toText(address.phone_mobile),
    dni: toText(address.dni),
    deleted: toText(address.deleted),
    date_add: toText(address.date_add),
    date_upd: toText(address.date_upd)
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

export async function apiAddress(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID address manquant')
  const xml = await get({ resource: 'addresses', id })
  return xmlToJson(xml)
}

export async function apiAddresses(options = {}) {
  const xml = await get({ resource: 'addresses', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function apiAddressesByCustomer(customerId) {
  if (!customerId) throw new Error('ID customer manquant')
  const xml = await get({
    resource: 'addresses',
    query: { 'filter[id_customer]': customerId, display: 'full' }
  })
  return xmlToJson(xml)
}

export async function getAddressDetail(id) {
  const detail = await apiAddress(id)
  const address = detail?.prestashop?.address ?? null
  return formatAddressData(address)
}

export async function getAllAddresses(options = {}) {
  const data = await apiAddresses(options)
  const nodes = data?.prestashop?.addresses?.address

  if (!nodes) {
    return []
  }

  const list = Array.isArray(nodes) ? nodes : [nodes]

  return list.map(item => formatAddressData(item)).filter(r => r !== null)
}

export async function getAddressesByCustomer(customerId) {
  const data = await apiAddressesByCustomer(customerId)
  const nodes = data?.prestashop?.addresses?.address

  if (!nodes) {
    return []
  }

  const list = Array.isArray(nodes) ? nodes : [nodes]
  return list
    .map(item => formatAddressData(item))
    .filter(r => r !== null)
}

function buildAddressPayload(data, includeId = false) {
  const idCountry = data?.id_country ?? DEFAULT_COUNTRY_ID
  if (!data?.alias) throw new Error('alias est requis')
  if (!data?.lastname) throw new Error('lastname est requis')
  if (!data?.firstname) throw new Error('firstname est requis')
  if (!data?.address1) throw new Error('address1 est requis')
  if (!data?.city) throw new Error('city est requis')

  const obj = {
    id_country: idCountry,
    alias: data.alias,
    lastname: data.lastname,
    firstname: data.firstname,
    address1: data.address1,
    city: data.city
  }

  if (includeId) obj.id = data.id

  if (data.id_customer) obj.id_customer = data.id_customer
  if (data.id_manufacturer) obj.id_manufacturer = data.id_manufacturer
  if (data.id_supplier) obj.id_supplier = data.id_supplier
  if (data.id_warehouse) obj.id_warehouse = data.id_warehouse
  if (data.id_state) obj.id_state = data.id_state
  if (data.company) obj.company = data.company
  if (data.vat_number) obj.vat_number = data.vat_number
  if (data.address2) obj.address2 = data.address2
  if (data.postcode) obj.postcode = data.postcode
  if (data.other) obj.other = data.other
  if (data.phone) obj.phone = data.phone
  if (data.phone_mobile) obj.phone_mobile = data.phone_mobile
  if (data.dni) obj.dni = data.dni
  if (data.deleted !== undefined) obj.deleted = data.deleted ? 1 : 0

  return obj
}

export async function createAddress(data) {
  const addressObj = buildAddressPayload(data)

  const xmlRequest = jsonToXml({
    prestashop: {
      address: addressObj
    }
  })

  const xmlResponse = await post({
    resource: 'addresses',
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function updateAddress(id, data) {
  if (id === undefined || id === null || id === '') throw new Error('ID address manquant pour la modification')
  const addressObj = buildAddressPayload({ ...data, id }, true)

  const xmlRequest = jsonToXml({
    prestashop: {
      address: addressObj
    }
  })

  const xmlResponse = await put({
    resource: 'addresses',
    id: id,
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function deleteAddress(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID address manquant')
  const xml = await del({ resource: 'addresses', id })
  return xmlToJson(xml)
}
