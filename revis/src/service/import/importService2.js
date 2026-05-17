import Papa from 'papaparse'
import { get, xmlToJson, toText } from '../../api/util.js'
import { getAllProducts } from '../productService.js'
import { 
  getAllProductOptions, createProductOption, 
  getAllProductOptionValues, createProductOptionValue, 
  createCombination 
} from '../declinaisonService.js'
import { updateStock, getStockDetail } from '../stockService.js'
import { getTaxRateForGroup } from '../taxeService.js'

function parseNumber(str) {
  if (!str) return 0
  let cleanStr = String(str).replace('%', '').replace(',', '.').trim()
  return parseFloat(cleanStr) || 0
}

export async function importDataFromCSV2(csvText) {
  const parsed = Papa.parse(csvText, {
    header: true,
    skipEmptyLines: true,
  })

  const requiredColumns = [
    'reference',
    'specificité',
    'karazany',
    'stock_initial',
    'prix_vente_ttc'
  ]

  const fieldSet = new Set(parsed?.meta?.fields || [])
  const missingColumns = requiredColumns.filter((col) => !fieldSet.has(col))
  if (missingColumns.length) {
    throw new Error(`Colonnes manquantes: ${missingColumns.join(', ')}`)
  }

  const records = parsed.data
  if (records.length === 0) throw new Error("Le fichier CSV est vide ou n'a pas de données valides.")

  const results = {
    combinationsCreated: 0,
    stocksUpdated: 0
  }

  const taxRateMap = new Map()

  async function getTaxRateForProduct(prod) {
    const groupId = String(prod?.id_tax_rules_group || '0')
    if (taxRateMap.has(groupId)) return taxRateMap.get(groupId)
    const rate = await getTaxRateForGroup(groupId)
    taxRateMap.set(groupId, rate || 0)
    return rate || 0
  }

  // 1. Récupération des données existantes
  const products = await getAllProducts()
  
  // On crée un dictionnaire des produits par référence
  const productMap = new Map()
  products.forEach(p => {
    if (p.reference) {
      productMap.set(p.reference.trim(), p)
    }
  })

  const existingOptions = await getAllProductOptions()
  const optionMap = new Map()
  existingOptions.forEach(opt => {
    // Si formaté via xmlToJson, récupérons le nom
    let name = ''
    if (opt.name && opt.name.language) {
      const lang = Array.isArray(opt.name.language) ? opt.name.language[0] : opt.name.language
      name = typeof lang === 'object' ? lang['#text'] || lang._ : lang
    } else if (typeof opt.name === 'string') {
      name = opt.name
    }
    if (name) {
      optionMap.set(name.trim().toLowerCase(), opt.id || opt['@id'])
    }
  })

  const existingOptionValues = await getAllProductOptionValues()
  const optionValueMap = new Map() // Clé: "id_option_group-nom_valeur" -> ID
  existingOptionValues.forEach(val => {
    let name = ''
    if (val.name && val.name.language) {
      const lang = Array.isArray(val.name.language) ? val.name.language[0] : val.name.language
      name = typeof lang === 'object' ? lang['#text'] || lang._ : lang
    } else if (typeof val.name === 'string') {
      name = val.name
    }
    let idGroup = val.id_attribute_group
    if (typeof idGroup === 'object' && idGroup['#text']) idGroup = idGroup['#text']
    
    if (name && idGroup) {
      const key = `${idGroup}-${name.trim().toLowerCase()}`
      optionValueMap.set(key, val.id || val['@id'])
    }
  })

  for (let i = 0; i < records.length; i++) {
    const row = records[i]
    if (!row.reference) continue

    const reference = row.reference.trim()
    const specificite = (row.specificité || '').trim()
    const karazany = (row.karazany || '').trim()
    const stock_initial = parseInt(row.stock_initial, 10) || 0
    const prix_vente_ttc = parseNumber(row.prix_vente_ttc)

    try {
      const product = productMap.get(reference)
      if (!product) {
        throw new Error(`Produit introuvable avec la référence: ${reference}`)
      }

      const id_product = product.id
      console.log(`Traitement du produit ID ${id_product} avec référence ${reference}`)
      let id_product_attribute = 0 // Par défaut, 0 si pas de déclinaison

      // Si une spécialité / option de déclinaison est définie
      if (specificite && karazany) {
        console.log(id_product)
        // 1. Gérer le groupe d'attribut (Product Option)
        const specKey = specificite.toLowerCase()
        let optionId = optionMap.get(specKey)
        if (!optionId) {
          const newOpt = await createProductOption({
            name: specificite,
            group_type: 'select',
            is_color_group: specificite.toLowerCase() === 'couleur'
          })
          optionId = newOpt?.prestashop?.product_option?.id
          if (optionId) optionMap.set(specKey, optionId)
        }

        // 2. Gérer la valeur d'attribut (Product Option Value)
        const valKey = `${optionId}-${karazany.toLowerCase()}`
        let optionValueId = optionValueMap.get(valKey)
        if (!optionValueId) {
          const newVal = await createProductOptionValue({
            id_attribute_group: optionId,
            name: karazany,
            // Optionnel: mapper une couleur si applicable (non géré par défaut ici)
          })
          optionValueId = newVal?.prestashop?.product_option_value?.id
          if (optionValueId) optionValueMap.set(valKey, optionValueId)
        }

        // 3. Créer la déclinaison (Combination)
        // Note: Le prix TTC dans le CSV est soit le prix final, soit l'impact.
        // Si c'est le prix final de la déclinaison, l'impact = prix TTC combin - prix TTC base. 
        // On supposera ici que prix_vente_ttc = prix de cette combinaison.
        // Or Presta attend un impact HT sur le prix de base. 
        // Pour simplifier l'exemple, on met l'impact à 0 ou on calcule si vous aviez stocké le prix de base.
        // Laissons le prix à 0 en impact, vu que la complexité des taxes s'ajouterait. 
        // À adapter si besoin d'impact TTC -> HT exact. 
        
        let priceImpact = 0
        if (prix_vente_ttc > 0 && product.price) {
          const baseHt = parseNumber(product.price)
          const taxRate = await getTaxRateForProduct(product)
          const baseTtc = baseHt * (1 + taxRate / 100)
          const diffTtc = prix_vente_ttc - baseTtc
          const diffHt = taxRate > 0 ? diffTtc / (1 + taxRate / 100) : diffTtc
          priceImpact = Number(diffHt.toFixed(6))
        }

        const newComb = await createCombination({
          id_product: id_product,
          product_option_value_ids: [optionValueId],
          reference: `${reference}-${karazany}`, // Ex: T_01-grand
          quantity: stock_initial,
          price: priceImpact,
          minimal_quantity: 1,
          default_on: false 
        })
        
        id_product_attribute = newComb?.prestashop?.combination?.id
        results.combinationsCreated++
      }

      // 4. Mettre à jour le stock (pour le produit simple ou la déclinaison)
      // On interroge d'abord le produit pour récupérer ses associations de stock_availables
      const productXml = await get({ resource: 'products', id: id_product })
      const productJson = xmlToJson(productXml)
      const stockAssocs = productJson?.prestashop?.product?.associations?.stock_availables?.stock_available
      
      let stockId = null
      if (stockAssocs) {
        const stockList = Array.isArray(stockAssocs) ? stockAssocs : [stockAssocs]
        for (const s of stockList) {
          const matchAttr = toText(s.id_product_attribute) || '0'
          
          if (String(matchAttr) === String(id_product_attribute)) {
            stockId = toText(s.id)
            break
          }
        }
      }
      if (stockId) {
        console.log(stockId)
        // Obtenir les valeurs EXACTES de la boutique générées par PrestaShop pour ce stock
        const realStock = await getStockDetail(stockId)

        await updateStock(stockId, {
          id_product: id_product,
          id_product_attribute: id_product_attribute,
          quantity: stock_initial,
          depends_on_stock: realStock?.depends_on_stock || 0,
          out_of_stock: realStock?.out_of_stock || 2,
          id_shop: realStock?.id_shop || '1',
          id_shop_group: realStock?.id_shop_group || '0'
        })
        results.stocksUpdated++
      } else {
        results.errors.push(`Stock non trouvé via associations du produit pour id_product=${id_product}, id_attribute=${id_product_attribute}`)
      }

    } catch (err) {
      const rowInfo = JSON.stringify(row)
      throw new Error(`Erreur ligne ${i + 1} (${reference}) : ${err.message}. Ligne: ${rowInfo}`)
    }
  }

  return results
}
