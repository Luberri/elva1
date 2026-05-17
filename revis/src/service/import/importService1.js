import { getAllCategories, createCategory } from '../categorieService.js'
import { getAllTaxes, getAllTaxRuleGroups, createFullTax } from '../taxeService.js'
import { createProduct } from '../productService.js'
import Papa from 'papaparse'

function parseNumber(str) {
  if (!str) return 0
  let cleanStr = String(str).replace('%', '').replace(',', '.').trim()
  return parseFloat(cleanStr) || 0
}

function normalizeAvailableDate(value) {
  const raw = String(value || '').trim()

  if (!raw) return null

  // format JJ/MM/AAAA
  const frMatch = raw.match(/^(\d{2})\/(\d{2})\/(\d{4})$/)

  if (frMatch) {
    const [, day, month, year] = frMatch

    return `${year}-${month}-${day}`
  }

  // format ISO
  const isoMatch = raw.match(/^\d{4}-\d{2}-\d{2}$/)

  if (isoMatch) {
    return raw
  }

  return null
}

export async function importDataFromCSV(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const requiredColumns = [
    'date_availability_produit',
    'nom',
    'reference',
    'prix_ttc',
    'Taxe',
    'categorie',
    'prix_achat'
  ]

  const fieldSet = new Set(parsed?.meta?.fields || [])
  const missingColumns = requiredColumns.filter((col) => !fieldSet.has(col))
  if (missingColumns.length) {
    throw new Error(`Colonnes manquantes: ${missingColumns.join(', ')}`)
  }

  const records = parsed.data
  if (records.length === 0) throw new Error("Le fichier CSV est vide ou n'a pas de données valides.")

  // 1. Récupération de l'existant pour éviter les doublons
  const existingCategories = await getAllCategories()
  // On récupère cette fois-ci "RuleGroups" plutôt que "Taxes" pour faire l'association du Produit
  const existingTaxRuleGroups = await getAllTaxRuleGroups()

  let catMap = new Map() // Nom -> ID
  existingCategories.forEach(c => {
    if (c.name) catMap.set(c.name.trim().toLowerCase(), c.id)
  })

  let taxGroupMap = new Map() // Nom du groupe -> ID
  existingTaxRuleGroups.forEach(tg => {
    if (tg.name) {
      // On s'attend à ce que le nom soit formaté "Taxe 11.65%" dans le script de création
      taxGroupMap.set(tg.name.trim().toLowerCase(), tg.id)
    }
  })

  // Permet de mapper dynamiquement une chaîne de taxe (ex: "11,65%") au format de nom attendu
  const getTaxGroupName = (rateStr) => {
    const rate = parseNumber(rateStr)
    return `taxe ${rate}%`.toLowerCase()
  }

  const results = {
    categoriesCreated: 0,
    taxesCreated: 0,
    productsCreated: 0
  }

  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    if (!row.nom) continue // Ligne sans nom (ou incomplète)

    const date_produit = normalizeAvailableDate(row.date_availability_produit)
    const nom = row.nom || ''
    const reference = row.reference || ''
    const prix_ttc_str = row.prix_ttc || '0'
    const taxe_str = row.Taxe || '0'
    const categorie_nom = row.categorie || ''
    const prix_achat = row.prix_achat || '0'

    try {
      // 1. Gestion de la Catégorie
      let categoryId = 2 // Défaut
      const catKey = categorie_nom ? categorie_nom.trim().toLowerCase() : ''
      if (catKey) {
        if (catMap.has(catKey)) {
          categoryId = catMap.get(catKey)
        } else {
          // Création
          const newCat = await createCategory({
            name: categorie_nom.trim(),
            active: true
          })
          categoryId = newCat?.prestashop?.category?.id || 2
          catMap.set(catKey, categoryId)
          results.categoriesCreated++
        }
      }

      // 2. Gestion de la Taxe
      const taxRate = parseNumber(taxe_str) 
      const taxGroupNameKey = getTaxGroupName(taxe_str)
      let taxRulesGroupId = null

      if (taxRate > 0) {
        if (taxGroupMap.has(taxGroupNameKey)) {
          // Si le groupe de règles de taxe avec ce nom (ex: "taxe 11.65%") existe déjà, on prend son ID
          taxRulesGroupId = taxGroupMap.get(taxGroupNameKey)
        } 
        
        // On recrée si on n'a pas pu identifier le groupe de règles
        if (!taxRulesGroupId) {
          const newFullTax = await createFullTax({
            name: `Taxe ${taxRate}%`,
            rate: taxRate,
            active: true
          })
          taxRulesGroupId = newFullTax.taxRulesGroupId
          if (taxRulesGroupId) taxGroupMap.set(taxGroupNameKey, taxRulesGroupId)
          results.taxesCreated++
        }
      }

      // 3. Gestion du Produit
      const prix_ttc = parseNumber(prix_ttc_str)
      const prix_ht = taxRate > 0 ? (prix_ttc / (1 + (taxRate / 100))) : prix_ttc

      await createProduct({
        name: nom.trim(),
        reference: reference.trim(),
        price: prix_ht.toFixed(6), // PrestaShop attend le prix HT
        id_category_default: categoryId,
        id_tax_rules_group: taxRulesGroupId || 0, // IMPORTANT : c'est un TaxRulesGroup qu'il faut insérer, pas une Tax pure
        active: true,
        available_date: date_produit,
        description: `Produit importé, Date: ${date_produit}`,
        wholesale_price: parseNumber(prix_achat).toFixed(6),
      })
      results.productsCreated++

    } catch (err) {
      const rowInfo = JSON.stringify(row)
      throw new Error(`Erreur ligne ${i + 1} (${nom}) : ${err.message}. Ligne: ${rowInfo}`)
    }
  }

  return results
}
