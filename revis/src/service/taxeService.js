import { get, post, put, del, xmlToJson, jsonToXml, DEFAULT_COUNTRY_ID } from '../api/util.js'
import { toLanguage, toText } from '../api/util.js'

export function formatTaxData(tax) {
  if (!tax) return null
  return {
    id: String(tax.id || ''),
    rate: parseFloat(toText(tax.rate)) || 0.0,
    active: toText(tax.active) === '1' || toText(tax.active) === 'true',
    deleted: toText(tax.deleted) === '1' || toText(tax.deleted) === 'true',
    name: toText(tax.name),
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

export async function apiTaxe(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID taxe manquant')
  const xml = await get({ resource: 'taxes', id })
  return xmlToJson(xml)
}

export async function apiTaxes(options = {}) {
  const xml = await get({ resource: 'taxes', query: buildListQuery(options) })
  return xmlToJson(xml)
}

export async function getTax(taxId) {
  const id = toText(taxId)
  if (!id) return null

  try {
    const taxData = await apiTaxe(id)
    const tax = taxData?.prestashop?.tax ?? null
    return formatTaxData(tax)
  } catch {
    return null
  }
}

export async function getAllTaxes(options = {}) {
  const data = await apiTaxes(options)
  const taxesNode = data?.prestashop?.taxes?.tax
  
  if (!taxesNode) {
    return []
  }

  const list = Array.isArray(taxesNode) ? taxesNode : [taxesNode]

  return list.map(item => formatTaxData(item)).filter(r => r !== null)
}

// -------------------------------------------------------------
// NOUVEAU: Récupère la liste de tous les groupes de règles de taxe
export async function getAllTaxRuleGroups() {
  const data = await get({ resource: 'tax_rule_groups' })
  const jsonData = xmlToJson(data)
  const groupsNode = jsonData?.prestashop?.tax_rule_groups?.tax_rule_group || jsonData?.prestashop?.tax_rule_groups?.tax_rules_group

  if (!groupsNode) return []
  
  const list = Array.isArray(groupsNode) ? groupsNode : [groupsNode]
  
  // On récupère le détail pour chaque groupe afin d'avoir son nom
  const rows = await Promise.all(
    list.map(async (item) => {
      const id = toText(item?.['@id'] || item?.id)
      if (!id) return null
      try {
        const detailData = await get({ resource: 'tax_rule_groups', id })
        const detailJson = xmlToJson(detailData)
        const group = detailJson?.prestashop?.tax_rule_group || detailJson?.prestashop?.tax_rules_group
        return {
          id: String(group?.id || id),
          name: toText(group?.name),
          active: toText(group?.active) === '1'
        }
      } catch (e) {
        return null
      }
    })
  )

  return rows.filter(r => r !== null)
}
// -------------------------------------------------------------

export async function getTaxRateForGroup(taxRulesGroupId) {
  const id = toText(taxRulesGroupId)
  if (!id || id === '0') return 0

  const xml = await get({
    resource: 'tax_rules',
    query: { 'filter[id_tax_rules_group]': id, display: 'full' }
  })
  const json = xmlToJson(xml)
  const rulesNode = json?.prestashop?.tax_rules?.tax_rule
  if (!rulesNode) return 0

  const rules = Array.isArray(rulesNode) ? rulesNode : [rulesNode]
  const firstRule = rules[0]
  const taxId = toText(firstRule?.id_tax)
  if (!taxId) return 0

  const tax = await getTax(taxId)
  return tax?.rate || 0
}

// ==========================================
// MÉTHODES CRUD POUR TAXES (Taux bruts)
// ==========================================

export async function createTax(data) {
  const taxObj = {
    rate: parseFloat(data.rate) || 0.0,
    active: data.active ? 1 : 0,
    deleted: 0,
    name: toLanguage(data.name || 'Nouvelle Taxe')
  }

  const xmlRequest = jsonToXml({ prestashop: { tax: taxObj } })

  const xmlResponse = await post({
    resource: 'taxes',
    body: xmlRequest
  })
  return xmlToJson(xmlResponse)
}

// ==========================================
// MÉTHODES CRUD POUR TAX RULE GROUPS
// (Conteneur logique assigné aux produits)
// ==========================================

export async function getTaxRuleGroup(id) {
  const xml = await get({ resource: 'tax_rule_groups', id })
  return xmlToJson(xml)
}

export async function createTaxRuleGroup(name, active = 1) {
  const xmlRequest = jsonToXml({
    prestashop: {
      tax_rules_group: {
        name: name,
        active: active ? 1 : 0,
        deleted: 0
      }
    }
  })
  const xmlResponse = await post({
    resource: 'tax_rule_groups',
    body: xmlRequest
  })
  const responseJson = xmlToJson(xmlResponse)
  return responseJson
}

export async function updateTaxRuleGroup(id, name, active = 1) {
  const xmlRequest = jsonToXml({
    prestashop: {
      tax_rules_group: {
        id: id,
        name: name,
        active: active ? 1 : 0,
        deleted: 0
      }
    }
  })
  const xmlResponse = await put({
    resource: 'tax_rule_groups',
    id: id,
    body: xmlRequest
  })
  return xmlToJson(xmlResponse)
}

export async function deleteTaxRuleGroup(id) {
  const xml = await del({ resource: 'tax_rule_groups', id })
  return xmlToJson(xml)
}


// ==========================================
// MÉTHODES CRUD POUR TAX RULES
// (La règle liant Pays/Zone à un Groupe et une Taxe)
// ==========================================

export async function createTaxRule(id_tax_rules_group, id_tax, id_country = DEFAULT_COUNTRY_ID, behavior = 0) {
  const xmlRequest = jsonToXml({
    prestashop: {
      tax_rule: {
        id_tax_rules_group: id_tax_rules_group,
        id_country: id_country,
        id_state: 0,
        zipcode_from: 0,
        zipcode_to: 0,
        id_tax: id_tax,
        behavior: behavior, // 0 = This tax only, 1 = Combine, 2 = One after another
        description: 'Règle auto-générée'
      }
    }
  })
  const xmlResponse = await post({
    resource: 'tax_rules',
    body: xmlRequest
  })
  return xmlToJson(xmlResponse)
}

// ==========================================
// FONCTION HAUT-NIVEAU (pour l'import)
// ==========================================

// Fonction utilitaire complète qui crée la taxe, le groupe et lie les deux automatiquement
export async function createFullTax(data) {
  // 1. Création de la taxe de base dans /api/taxes
  const taxRes = await createTax(data)
  const taxId = taxRes?.prestashop?.tax?.id
  
  if (!taxId) throw new Error("Échec de la création de la taxe dans l'API")

  // 2. Création du groupe de règles (Le fameux conteneur id_tax_rules_group)
  const ruleGroupRes = await createTaxRuleGroup(data.name || `TVA ${data.rate}%`)
  const taxRulesGroupId = ruleGroupRes?.prestashop?.tax_rule_group?.id || ruleGroupRes?.prestashop?.tax_rules_group?.id

  // 3. On crée la règle dans /api/tax_rules qui fait :
  // product.id_tax_rules_group -> tax_rules.id_tax_rules_group -> tax_rules.id_tax -> taxes.rate
  if (taxRulesGroupId) {
    await createTaxRule(taxRulesGroupId, taxId)
  }

  return { taxId, taxRulesGroupId }
}



export async function updateTax(id, data) {
  if (id === undefined || id === null || id === '') throw new Error('ID taxe manquant pour la modification')

  const taxObj = {
    id: id,
    rate: parseFloat(data.rate) || 0.0,
    active: data.active ? 1 : 0,
    deleted: data.deleted ? 1 : 0,
    name: toLanguage(data.name || 'Taxe')
  }

  const xmlRequest = jsonToXml({
    prestashop: {
      tax: taxObj
    }
  })

  const xmlResponse = await put({
    resource: 'taxes',
    id: id,
    body: xmlRequest
  })

  return xmlToJson(xmlResponse)
}

export async function deleteTax(id) {
  if (id === undefined || id === null || id === '') throw new Error('ID taxe manquant')
  const xml = await del({ resource: 'taxes', id })
  return xmlToJson(xml)
}
