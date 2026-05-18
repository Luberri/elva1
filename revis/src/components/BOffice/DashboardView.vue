<template>
  <section class="dashboard-section">
    <header class="header">
      <h1>Tableau de bord</h1>
      <!-- Base Bootstrap : .btn et .btn-secondary -->
      <button class="btn btn-secondary" :disabled="loading" @click="loadOrders">
        {{ loading ? 'Chargement...' : 'Recharger' }}
      </button>
    </header>

    <!-- Base Bootstrap : alertes pour les messages -->
    <p v-if="error" class="alert alert-danger">{{ error }}</p>
    <p v-if="loading">Chargement...</p>

    <div v-else class="dashboard-content">
      
      <!-- Zone de filtre avec la base Bootstrap -->
      <div class="filters-container">
        <div class="filter-item">
          <label class="form-label" for="dateStart">Date debut</label>
          <input class="form-control" id="dateStart" type="date" v-model="dateStart" />
        </div>
        <div class="filter-item">
          <label class="form-label" for="dateEnd">Date fin</label>
          <input class="form-control" id="dateEnd" type="date" v-model="dateEnd" />
        </div>
        <div class="form-check">
          <input
            class="form-check-input"
            id="includeCarts"
            type="checkbox"
            v-model="includeUnorderedCarts"
            :disabled="loading"
          />
          <label class="form-check-label" for="includeCarts">
            Inclure paniers non commandes
          </label>
        </div>
      </div>

      <p v-if="includeUnorderedCarts" class="alert alert-info">
        Les totaux incluent les paniers non commandes.
      </p>

      <div class="stats">
        <div class="stat-card">
          <p class="stat-label">Commandes (jour)</p>
          <p class="stat-value">{{ dayStats.count }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Montant HT (jour)</p>
          <p class="stat-value">{{ formatPrice(dayStats.totalHt) }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Montant TTC (jour)</p>
          <p class="stat-value">{{ formatPrice(dayStats.totalTtc) }}</p>
        </div>
      </div>

      <div class="stats total">
        <div class="stat-card">
          <p class="stat-label">Total general - Commandes</p>
          <p class="stat-value">{{ totalStats.count }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Total general - HT</p>
          <p class="stat-value">{{ formatPrice(totalStats.totalHt) }}</p>
        </div>
        <div class="stat-card">
          <p class="stat-label">Total general - TTC</p>
          <p class="stat-value">{{ formatPrice(totalStats.totalTtc) }}</p>
        </div>
      </div>

      <!-- Base Bootstrap : .table et .table-striped pour un joli tableau -->
      <table v-if="dailyRows.length" class="table table-striped">
        <thead>
          <tr>
            <th>Jour</th>
            <th>Nb commandes</th>
            <th>Montant HT</th>
            <th>Montant TTC</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in dailyRows" :key="row.date">
            <td>{{ row.date }}</td>
            <td>{{ row.count }}</td>
            <td>{{ formatPrice(row.totalHt) }}</td>
            <td>{{ formatPrice(row.totalTtc) }}</td>
          </tr>
        </tbody>
      </table>
      <p v-else class="alert alert-info">Aucune commande disponible.</p>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { DEFAULT_CURRENCY_NAME } from '../../api/util.js'
import { getAllOrders, getOrderDateKey, isCartOrdered } from '../../service/orderService.js'
import { getAllCarts } from '../../service/cartService.js'
import { getAllProducts, getPriceTtcWithImpact, parsePriceValue } from '../../service/productService.js'
import { getCombinationsByProduct } from '../../service/combinationService.js'
import { getTaxRateForGroup } from '../../service/taxeService.js'

const loading = ref(false)
const error = ref('')
const orders = ref([])
const dateStart = ref('')
const dateEnd = ref('')
const includeUnorderedCarts = ref(false)
const carts = ref([])
const productMap = ref(new Map())
const taxRateMap = ref(new Map())
const combinationMap = ref(new Map())

async function loadOrders() {
  error.value = ''
  loading.value = true
  try {
    orders.value = await getAllOrders({ filters: {} })

    if (includeUnorderedCarts.value) {
      await loadUnorderedCarts()
    } else {
      carts.value = []
    }
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

const activeOrders = computed(() =>
  (Array.isArray(orders.value) ? orders.value : []).filter(
    (order) => String(order?.current_state || '') === '2'
  )
)
const orderEntries = computed(() =>
  activeOrders.value
    .map(order => ({
      date: getOrderDateKey(order),
      totalHt: Number(order?.total_products || 0),
      totalTtc: Number(order?.total_paid || order?.total_products_wt || 0)
    }))
    .filter(entry => entry.date)
)

const cartEntries = computed(() => {
  if (!includeUnorderedCarts.value) return []

  return carts.value
    .map(cart => {
      const totals = computeCartTotals(cart?.cartRows || [])
      return {
        date: getCartDateKey(cart),
        totalHt: totals.totalHt,
        totalTtc: totals.totalTtc
      }
    })
    .filter(entry => entry.date)
})

const allEntries = computed(() => [...orderEntries.value, ...cartEntries.value])
const filteredEntries = computed(() => {
  const start = dateStart.value
  const end = dateEnd.value
  if (!start && !end) return allEntries.value

  return allEntries.value.filter(entry => isDateInRange(entry.date, start, end))
})

const dayStats = computed(() => sumEntries(filteredEntries.value))
const totalStats = computed(() => sumEntries(allEntries.value))

const dailyRows = computed(() => {
  const map = new Map()
  for (const entry of allEntries.value) {
    const key = entry.date
    if (!key) continue
    if (!map.has(key)) {
      map.set(key, { date: key, totalHt: 0, totalTtc: 0, count: 0 })
    }
    const row = map.get(key)
    row.totalHt += Number(entry.totalHt || 0)
    row.totalTtc += Number(entry.totalTtc || 0)
    row.count += 1
  }

  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1))
})

function formatPrice(value) {
  const num = Number(value || 0)
  return `${num.toFixed(2)} ${DEFAULT_CURRENCY_NAME}`
}

function isDateInRange(dateKey, start, end) {
  if (!dateKey) return false
  if (start && dateKey < start) return false
  if (end && dateKey > end) return false
  return true
}

function getCartDateKey(cart) {
  const value = String(cart?.date_add || '').trim()
  if (!value) return ''
  return value.split(' ')[0]
}

function sumEntries(entries) {
  let totalHt = 0
  let totalTtc = 0

  for (const entry of entries) {
    totalHt += Number(entry?.totalHt || 0)
    totalTtc += Number(entry?.totalTtc || 0)
  }

  return {
    totalHt,
    totalTtc,
    count: entries.length
  }
}

function computeCartTotals(cartRows) {
  let totalHt = 0
  let totalTtc = 0

  for (const row of cartRows) {
    const product = productMap.value.get(String(row.id_product))
    if (!product) continue
    const comb = combinationMap.value.get(String(row.id_product_attribute || 0))
    const impact = comb ? parsePriceValue(comb.price) : 0
    const unitHt = parsePriceValue(product.price) + impact
    const qty = Number(row.quantity || 0)
    const rate = taxRateMap.value.get(String(product.id_tax_rules_group)) || 0
    const unitTtc = getPriceTtcWithImpact(product.price, rate, impact)

    totalHt += unitHt * qty
    totalTtc += unitTtc * qty
  }

  return { totalHt, totalTtc }
}

async function loadUnorderedCarts() {
  const all = await getAllCarts({ filters: {} })
  if (!all.length) {
    carts.value = []
    return
  }

  const checks = await Promise.all(
    all.map(async (cart) => ({
      cart,
      ordered: await isCartOrdered(cart.id)
    }))
  )

  const open = checks.filter(item => !item.ordered).map(item => item.cart)
  carts.value = open
  await loadCartPricingData(open)
}

async function loadCartPricingData(openCarts) {
  if (!openCarts.length) return

  const products = await getAllProducts({ filters: {} })
  productMap.value = new Map(products.map(p => [String(p.id), p]))

  const productIds = [...new Set(
    openCarts.flatMap(cart => (cart?.cartRows || []).map(row => String(row.id_product)))
  )]

  const combinationLists = await Promise.all(
    productIds.map(async (id) => getCombinationsByProduct(id))
  )
  const allCombinations = combinationLists.flat()
  combinationMap.value = new Map(allCombinations.map(c => [String(c.id), c]))

  const usedProducts = productIds
    .map(id => productMap.value.get(String(id)))
    .filter(Boolean)
  const groupIds = [...new Set(usedProducts.map(p => String(p.id_tax_rules_group || '0')))]
  const entries = await Promise.all(
    groupIds.map(async (id) => {
      const rate = await getTaxRateForGroup(id)
      return [id, rate]
    })
  )

  taxRateMap.value = new Map(entries)
}

watch(includeUnorderedCarts, () => {
  loadOrders()
})

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
/* Conservation de vos styles CSS personnalisés d'origine */
.dashboard-section {
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

/* Alignement simple de votre filtre en ligne */
.filters-container {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-bottom: 24px;
}

.filters-container input {
  max-width: 200px; /* Évite que l'input prenne 100% de la largeur */
}

.filter-item {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin-bottom: 16px;
}

.stats.total {
  margin-bottom: 24px;
}

.stat-card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  padding: 12px 14px;
  border: 1px solid #eee;
}

.stat-label {
  color: #666;
  font-size: 13px;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 18px;
  font-weight: 600;
}
</style>
