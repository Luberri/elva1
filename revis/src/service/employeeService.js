import { get, post, put, del, xmlToJson, jsonToXml } from '../api/util.js'
import { toText } from '../api/util.js'
import bcrypt from 'bcryptjs'

export function formatEmployeeData(employee) {
  if (!employee) return null
  return {
    id: String(employee.id || ''),
    id_lang: toText(employee.id_lang),
    lastname: toText(employee.lastname),
    firstname: toText(employee.firstname),
    email: toText(employee.email),
    active: toText(employee.active) === '1',
    id_profile: toText(employee.id_profile),
    bo_theme: toText(employee.bo_theme),
    default_tab: toText(employee.default_tab),
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

export async function apiEmployee(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID employe manquant')
  const xml = await get({ resource: 'employees', id })
  return xmlToJson(xml)
}

export async function apiEmployees(options = {}) {
  const xml = await get({ resource: 'employees', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function getEmployee(employeeId) {
  const id = toText(employeeId)
  if (!id) return null

  try {
    const data = await apiEmployee(id)
    const employee = data?.prestashop?.employee ?? null
    return formatEmployeeData(employee)
  } catch {
    return null
  }
}

export async function getAllEmployees(options = {}) {
  const data = await apiEmployees(options)
  const nodes = data?.prestashop?.employees?.employee
  
  if (!nodes) {
    return []
  }

  const list = Array.isArray(nodes) ? nodes : [nodes]
  return list.map(item => formatEmployeeData(item)).filter(r => r !== null)
}

export async function createEmployee(data) {
  const obj = {
    lastname: data.lastname || '',
    firstname: data.firstname || '',
    email: data.email || '',
    passwd: data.passwd || '', // Le mot de passe devra idéalement être chiffré selon la conf PrestaShop
    active: data.active ? 1 : 0,
    id_profile: data.id_profile || 1, // 1 = SuperAdmin, etc.
    id_lang: data.id_lang || 1,
    default_tab: data.default_tab || 1,
    bo_theme: data.bo_theme || 'default',
    bo_css: data.bo_css || 'theme.css'
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      employee: obj
    }
  })

  const xmlResponse = await post({
    resource: 'employees',
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function updateEmployee(id, data) {
  if (!id) throw new Error('ID employe manquant pour la modification')

  const obj = {
    id: id,
    lastname: data.lastname,
    firstname: data.firstname,
    email: data.email,
    active: data.active ? 1 : 0,
    id_profile: data.id_profile || 1,
    id_lang: data.id_lang || 1
  }

  // Si on change le mot de passe
  if (data.passwd) {
    obj.passwd = data.passwd
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      employee: obj
    }
  })

  const xmlResponse = await put({
    resource: 'employees',
    id: id,
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function deleteEmployee(id) {
  if (!id) throw new Error('ID employe manquant')
  const xml = await del({ resource: 'employees', id })
  return xmlToJson(xml)
}

/**
 * Fonction de Login pour l'employé
 */
export async function loginEmployee(email, password) {
  if (!email || !password) throw new Error('Email et mot de passe requis')

  // On recherche l'employé par son email
  try {
    const data = await get({ 
      resource: 'employees', 
      query: { 'filter[email]': email, display: 'full' } 
    })
    
    // Convertir de XML texte à l'objet JSON
    const jsonData = xmlToJson(data) 
    const employeesNode = jsonData?.prestashop?.employees?.employee
    
    if (!employeesNode) {
      throw new Error('Email incorrect ou employé non trouvé')
    }

    // Gère le cas où l'API renvoie un seul ou plusieurs résultats
    const employee = Array.isArray(employeesNode) ? employeesNode[0] : employeesNode
    const hash = toText(employee.passwd)

    const isMatch = await bcrypt.compare(password, hash);
    if (!isMatch) throw new Error('Mot de passe incorrect');

    return formatEmployeeData(employee)

  } catch (error) {
    throw new Error('Échec de la connexion : ' + error.message)
  }
}
