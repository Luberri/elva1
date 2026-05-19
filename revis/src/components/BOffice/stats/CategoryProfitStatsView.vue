<template>
  <section class="dashboard-section">
    <header class="header">
      <div>
        <h1>Statistiques par catégorie</h1>
        <p class="text-muted" style="margin: 4px 0 0;">
          Ventes HT, achats HT, bénéfice (commandes payées / livrées)
        </p>
      </div>
      <button class="btn btn-secondary" :disabled="loading" @click="load">
        {{ loading ? 'Chargement...' : 'Rafraîchir' }}
      </button>
    </header>

    <p v-if="error" class="alert alert-danger">{{ error }}</p>

    <div class="filters" style="margin-bottom: 14px; display:flex; gap: 10px; align-items:end; flex-wrap: wrap;">
      <div style="min-width: 260px;">
        <label class="form-label">Filtre catégorie</label>
        <select class="form-control" v-model="selectedCategoryId" :disabled="loading">
          <option value="">Toutes les catégories</option>
          <option v-for="c in categoryOptions" :key="c.id" :value="c.id">
            {{ c.name }} (#{{ c.id }})
          </option>
        </select>
      </div>
    </div>

    <div v-if="loading">Chargement...</div>

    <div v-else>
      <div class="stats" style="display:flex; gap:12px; flex-wrap: wrap; margin-bottom: 16px;">
        <div class="stat-card" style="flex:1; min-width: 200px;" >
          <p class="stat-label">Total ventes HT</p>
          <p class="stat-value">{{ formatMoney(summary.totalSalesHt) }}</p>
        </div>
        <div class="stat-card" style="flex:1; min-width: 200px;" >
          <p class="stat-label">Total achats HT</p>
          <p class="stat-value">{{ formatMoney(summary.totalPurchaseHt) }}</p>
        </div>
        <div class="stat-card" style="flex:1; min-width: 200px;" >
          <p class="stat-label">Total achats stock (mouvements +)</p>
          <p class="stat-value">{{ formatMoney(summary.totalStockPurchaseHt) }}</p>
        </div>
        <div class="stat-card" style="flex:1; min-width: 200px;" >
          <p class="stat-label">Bénéfice</p>
          <p class="stat-value">{{ formatMoney(summary.totalProfit) }}</p>
        </div>
      </div>

      <table class="table table-striped" v-if="visibleRows.length">
        <thead>
          <tr>
            <th>Catégorie</th>
            <th>Ventes HT</th>
            <th>Achats HT</th>
            <th>Bénéfice</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in visibleRows" :key="row.categoryId">
            <td>{{ row.categoryName }}</td>
            <td>{{ formatMoney(row.salesHt) }}</td>
            <td>{{ formatMoney(row.purchaseHt) }}</td>
            <td>{{ formatMoney(row.profit) }}</td>
          </tr>
        </tbody>
      </table>

      <p v-else class="alert alert-info">Aucune donnée.</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { DEFAULT_CURRENCY_NAME } from '../../../api/util.js'
import { getAllOrders, getOrderDetail } from '../../../service/orderService.js'
import { getAllProducts, parsePriceValue } from '../../../service/productService.js'
import { getAllCategories } from '../../../service/categorieService.js'
import { getCombinationsByProduct } from '../../../service/combinationService.js'
import { getAllStockMvts } from '../../../service/stockMvtService.js'

const loading = ref(false)
const error = ref('')

const selectedCategoryId = ref('')

const categories = ref([])
const products = ref([])
const orders = ref([])
const stockMovements = ref([])

const combinationsByProductId = ref(new Map())

const SALES_STATES = new Set(['2', '5'])

function formatMoney(value) {
  const n = Number(value || 0)
  return `${n.toFixed(2)} ${DEFAULT_CURRENCY_NAME}`
}

function toNumber(value) {
  const n = parsePriceValue(value)
  return Number.isFinite(n) ? n : 0
}

async function load() {
  loading.value = true
  error.value = ''

  try {
    const [catList, prodList, orderList] = await Promise.all([
      getAllCategories({ filters: {}, display: 'full' }),
      getAllProducts({ filters: {}, display: 'full' }),
      getAllOrders({ filters: {}, display: 'full' })
    ])

    const mvtList = await getAllStockMvts({ filters: {}, display: 'full' })

    categories.value = Array.isArray(catList) ? catList : []
    products.value = Array.isArray(prodList) ? prodList : []
    orders.value = Array.isArray(orderList) ? orderList : []
    stockMovements.value = Array.isArray(mvtList) ? mvtList : []

    // Build combinations cache only for products used with attributes
    const productIdsNeedingCombinations = new Set()

    const relevantOrders = orders.value.filter(o => SALES_STATES.has(String(o.current_state || '')))

    // Ensure we have rows; fetch detail only when missing
    const ensuredDetails = await Promise.all(
      relevantOrders.map(async (o) => {
        if (Array.isArray(o.orderRows) && o.orderRows.length) return o
        return await getOrderDetail(o.id)
      })
    )

    // Replace in-memory relevant orders with ensured ones
    const ensuredById = new Map(ensuredDetails.map(o => [String(o.id), o]))
    orders.value = orders.value.map(o => ensuredById.get(String(o.id)) || o)

    for (const o of ensuredDetails) {
      const rows = Array.isArray(o?.orderRows) ? o.orderRows : []
      for (const r of rows) {
        const productId = String(r.product_id || r.id_product || '').trim()
        const attrId = String(r.product_attribute_id || r.id_product_attribute || '0').trim() || '0'
        if (!productId) continue
        productIdsNeedingCombinations.add(productId)
      }
    }

    const combEntries = await Promise.all(
      Array.from(productIdsNeedingCombinations).map(async (productId) => {
        const list = await getCombinationsByProduct(productId)
        return [String(productId), Array.isArray(list) ? list : []]
      })
    )

    combinationsByProductId.value = new Map(combEntries)
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

const categoryOptions = computed(() =>
  (Array.isArray(categories.value) ? categories.value : [])
    .map(c => ({ id: String(c.id), name: String(c.name || c.id) }))
    .sort((a, b) => a.name.localeCompare(b.name))
)

const productMap = computed(() =>
  new Map(
    (Array.isArray(products.value) ? products.value : []).map(p => [String(p.id), p])
  )
)

const categoryNameMap = computed(() =>
  new Map(
    (Array.isArray(categories.value) ? categories.value : []).map(c => [String(c.id), String(c.name || c.id)])
  )
)

function getWholesalePrice(productId, productAttributeId) {
  const product = productMap.value.get(String(productId))
  const attrId = String(productAttributeId || '0')

  if (attrId !== '0') {
    const list = combinationsByProductId.value.get(String(productId)) || []
    const comb = list.find(c => String(c.id) === attrId)
    if (comb?.wholesale_price !== undefined && comb?.wholesale_price !== null && String(comb.wholesale_price).trim() !== '') {
      return toNumber(comb.wholesale_price)
    }
  }

  return toNumber(product?.wholesale_price)
}

function getStockMovementPurchasePrice(mvt) {
  const productId = String(mvt?.id_product || '').trim()
  const attrId = String(mvt?.id_product_attribute || '0').trim() || '0'
  const unit = getWholesalePrice(productId, attrId)
  if (Number.isFinite(unit) && unit > 0) {
    return unit
  }
  return toNumber(mvt?.price_te)
}

const computedRows = computed(() => {
  const totalsByCategory = new Map()

  const relevantOrders = (Array.isArray(orders.value) ? orders.value : [])
    .filter(o => SALES_STATES.has(String(o.current_state || '')))

  for (const o of relevantOrders) {
    const rows = Array.isArray(o?.orderRows) ? o.orderRows : []

    for (const r of rows) {
      const productId = String(r.product_id || r.id_product || '').trim()
      if (!productId) continue

      const attrId = String(r.product_attribute_id || r.id_product_attribute || '0').trim() || '0'
      const qty = Number(r.product_quantity || 0)
      if (!Number.isFinite(qty) || qty <= 0) continue

      const product = productMap.value.get(productId)
      const categoryId = String(product?.categorieId || '').trim()
      if (!categoryId) continue

      const unitSalesHt = toNumber(r.unit_price_tax_excl || r.product_price)
      const salesHt = unitSalesHt * qty

      const unitPurchaseHt = getWholesalePrice(productId, attrId)
      const purchaseHt = unitPurchaseHt * qty

      const cur = totalsByCategory.get(categoryId) || { salesHt: 0, purchaseHt: 0 }
      cur.salesHt += salesHt
      cur.purchaseHt += purchaseHt
      totalsByCategory.set(categoryId, cur)
    }
  }

  const out = []
  for (const [categoryId, t] of totalsByCategory.entries()) {
    const salesHt = Number(t.salesHt || 0)
    const purchaseHt = Number(t.purchaseHt || 0)
    out.push({
      categoryId,
      categoryName: categoryNameMap.value.get(categoryId) || categoryId,
      salesHt,
      purchaseHt,
      profit: salesHt - purchaseHt
    })
  }

  out.sort((a, b) => a.categoryName.localeCompare(b.categoryName))
  return out
})

const visibleRows = computed(() => {
  const id = String(selectedCategoryId.value || '').trim()
  if (!id) return computedRows.value
  return computedRows.value.filter(r => String(r.categoryId) === id)
})

const summary = computed(() => {
  let totalSalesHt = 0
  let totalPurchaseHt = 0
  for (const r of visibleRows.value) {
    totalSalesHt += Number(r.salesHt || 0)
    totalPurchaseHt += Number(r.purchaseHt || 0)
  }

  let totalStockPurchaseHt = 0
  const selectedCategory = String(selectedCategoryId.value || '').trim()
  for (const mvt of (Array.isArray(stockMovements.value) ? stockMovements.value : [])) {
    if (String(mvt?.sign || '') !== '1') continue
    if (selectedCategory) {
      const product = productMap.value.get(String(mvt?.id_product || ''))
      const categoryId = String(product?.categorieId || '').trim()
      if (!categoryId || categoryId !== selectedCategory) continue
    }
    const unit = getStockMovementPurchasePrice(mvt)
    const qty = Number(mvt?.physical_quantity || 0)
    if (!Number.isFinite(qty) || qty <= 0) continue
    totalStockPurchaseHt += unit * qty
  }

  return {
    totalSalesHt,
    totalPurchaseHt,
    totalStockPurchaseHt,
    totalProfit: totalSalesHt - totalPurchaseHt
  }
})

onMounted(load)
</script>

<style scoped>
.dashboard-section {
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
  gap: 12px;
}

.stat-card {
  background: #fff;
  padding: 12px;
  border-radius: 8px;
  border: 1px solid #eee;
}

.stat-label {
  margin: 0;
  font-size: 12px;
  color: #777;
}

.stat-value {
  margin: 6px 0 0;
  font-size: 20px;
  font-weight: 600;
}
</style>
