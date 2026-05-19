<template>
  <section class="dashboard-section">
    <header class="header">
      <h1>Stock par catégorie</h1>
      <div style="display:flex; gap:8px; align-items:center;">
        <RouterLink to="/dashboard" class="btn btn-secondary">← Retour</RouterLink>
        <button class="btn btn-secondary" :disabled="loading" @click="load">
          {{ loading ? 'Chargement...' : 'Rafraîchir' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="alert alert-danger">{{ error }}</p>
    <p v-if="loading">Chargement...</p>

    <div v-else>
      <table class="table table-bordered">
        <thead>
          <tr>
            <th>Catégorie</th>
            <th>Qté physique</th>
            <th>Qté réservé</th>
            <th>Qté disponible</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td colspan="4" class="text-center">Aucune donnée.</td>
          </tr>
          <tr v-for="row in rows" :key="row.categoryId">
            <td>{{ row.categoryName }}</td>
            <td>{{ row.physical }}</td>
            <td>{{ row.reserved }}</td>
            <td>{{ row.available }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAllCategories } from '../../../service/categorieService.js'
import { getAllProducts } from '../../../service/productService.js'
import { getAllStocks as getAllPhysicalStocks } from '../../../service/stockService.js'

const loading = ref(false)
const error = ref('')

const categories = ref([])
const products = ref([])
const stocks = ref([])

function toInt(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [catList, prodList, stockList] = await Promise.all([
      getAllCategories({ filters: {}, display: 'full' }),
      getAllProducts({ filters: {}, display: 'full' }),
      getAllPhysicalStocks({ filters: {}, display: 'full' })
    ])

    categories.value = Array.isArray(catList) ? catList : []
    products.value = Array.isArray(prodList) ? prodList : []
    stocks.value = Array.isArray(stockList) ? stockList : []
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

const rows = computed(() => {
  const categoryNameById = new Map(
    (Array.isArray(categories.value) ? categories.value : []).map(c => [String(c.id), String(c.name || c.id)])
  )

  const categoryIdByProductId = new Map(
    (Array.isArray(products.value) ? products.value : []).map(p => [String(p.id), String(p.categorieId || '')])
  )

  // Somme des quantités physiques/usuelles par produit
  const productTotals = new Map()
  for (const s of (Array.isArray(stocks.value) ? stocks.value : [])) {
    const productId = String(s.id_product || '')
    if (!productId) continue

    const physical = toInt(s.physical_quantity)
    const usable = toInt(s.usable_quantity)

    const cur = productTotals.get(productId) || { physical: 0, usable: 0 }
    cur.physical += physical
    cur.usable += usable
    productTotals.set(productId, cur)
  }

  // Agrégation par catégorie
  const categoryTotals = new Map()
  for (const [productId, totals] of productTotals.entries()) {
    const categoryId = categoryIdByProductId.get(productId)
    if (!categoryId) continue

    const cur = categoryTotals.get(categoryId) || { physical: 0, usable: 0 }
    cur.physical += totals.physical
    cur.usable += totals.usable
    categoryTotals.set(categoryId, cur)
  }

  const out = []
  for (const [categoryId, totals] of categoryTotals.entries()) {
    const physical = totals.physical
    const available = totals.usable
    const reserved = Math.max(0, physical - available)

    out.push({
      categoryId,
      categoryName: categoryNameById.get(categoryId) || categoryId,
      physical,
      reserved,
      available
    })
  }

  out.sort((a, b) => String(a.categoryName).localeCompare(String(b.categoryName)))
  return out
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
  align-items: center;
  margin-bottom: 20px;
}
</style>
