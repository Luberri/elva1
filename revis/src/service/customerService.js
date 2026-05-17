import { get, post, del, xmlToJson, jsonToXml } from '../api/util.js'
import { routerKey,useRouter } from 'vue-router'
import { toText } from '../api/util.js'
import bcrypt from 'bcryptjs'

export function formatCustomerData(customer) {
  if (!customer) return null
  return {
    id: String(customer.id || ''),
    firstname: toText(customer.firstname),
    lastname: toText(customer.lastname),
    email: toText(customer.email),
    passwd: toText(customer.passwd),
    secure_key: toText(customer.secure_key),
    active: toText(customer.active),
    company: toText(customer.company),
    is_guest: toText(customer.is_guest),
    date_add: toText(customer.date_add)
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

export async function apiCustomer(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID customer manquant')
  const xml = await get({ resource: 'customers', id })
  return xmlToJson(xml)
}

export async function apiCustomers(options = {}) {
  const xml = await get({ resource: 'customers', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function getCustomerDetail(id) {
  const detail = await apiCustomer(id)
  const customer = detail?.prestashop?.customer ?? null
  return formatCustomerData(customer)
}

export async function getAllCustomers(options = {}) {
  const data = await apiCustomers(options)
  const customersNode = data?.prestashop?.customers?.customer
  
  if (!customersNode) {
    return []
  }

  const list = Array.isArray(customersNode) ? customersNode : [customersNode]
  return list.map(item => formatCustomerData(item)).filter(r => r !== null)
}

export async function createCustomer(data) {
  const jsonObj = {
    prestashop: {
      customer: {
        passwd: data.passwd,
        lastname: data.lastname,
        firstname: data.firstname,
        email: data.email,
        id_default_group: 3,
        active: data.active === false ? '0' : '1',
      }
    }
  }

  const xmlBody = jsonToXml(jsonObj)
  const responseXml = await post({
    resource: 'customers',
    body: xmlBody
  })
  
  return xmlToJson(responseXml)
}

export async function deleteCustomer(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID customer manquant')
  const xml = await del({ resource: 'customers', id })
  return xmlToJson(xml)
}

export async function loginCustomer(email, password ,is_hash = true) {
  if (!email || !password) throw new Error('Email et mot de passe requis')

  try {
    const data = await get({
      resource: 'customers',
      query: { 'filter[email]': email, display: 'full' }
    })

    const jsonData = xmlToJson(data)
    const customersNode = jsonData?.prestashop?.customers?.customer

    if (!customersNode) {
      throw new Error('Email incorrect ou client non trouve')
    }

    const customer = Array.isArray(customersNode) ? customersNode[0] : customersNode
    const hash = toText(customer.passwd)
    console.log('Hash stocké :', hash)
    let isMatch = false
    if(is_hash){
      console.log('true')
      isMatch = await bcrypt.compare(password, hash)
      console.log(password, hash, isMatch)
    console.log('1Résultat de la comparaison :', isMatch)

    } else {
      console.log('false')
      isMatch = password === hash
      console.log(password, hash, isMatch)
    console.log('2  Résultat de la comparaison :', isMatch)

    }
    console.log('111Résultat de la comparaison :', isMatch)
    if (!isMatch) throw new Error('Mot de passe incorrect')

    return formatCustomerData(customer)
  } catch (error) {
    throw new Error('Echec de la connexion : ' + error.message)
  }
}

export async function getCustomerByEmail(email) {
  if (!email) throw new Error('Email manquant')

  const data = await get({
    resource: 'customers',
    query: { 'filter[email]': email, display: 'full' }
  })

  const jsonData = xmlToJson(data)
  const customersNode = jsonData?.prestashop?.customers?.customer
  if (!customersNode) return null

  const customer = Array.isArray(customersNode) ? customersNode[0] : customersNode
  return formatCustomerData(customer)
}