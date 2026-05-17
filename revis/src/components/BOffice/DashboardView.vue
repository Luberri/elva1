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
        <label class="form-label" for="dateKey">Par jour</label>
        <input class="form-control" id="dateKey" type="date" v-model="dateKey" />
      </div>

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
import { computed, onMounted, ref } from 'vue'
import { DEFAULT_CURRENCY_NAME } from '../../api/util.js'
import { filterOrdersByDate, getAllOrders, getOrderDateKey, sumOrderTotals } from '../../service/orderService.js'

const loading = ref(false)
const error = ref('')
const orders = ref([])
const dateKey = ref('')

async function loadOrders() {
  error.value = ''
  loading.value = true
  try {
    orders.value = await getAllOrders({ filters: {} })
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

const activeOrders = computed(() =>
  (Array.isArray(orders.value) ? orders.value : []).filter(
    (order) => String(order?.current_state || '') !== '6'
  )
)
const filteredOrders = computed(() => filterOrdersByDate(activeOrders.value, dateKey.value))
const dayStats = computed(() => sumOrderTotals(filteredOrders.value))
const totalStats = computed(() => sumOrderTotals(activeOrders.value))

const dailyRows = computed(() => {
  const map = new Map()
  for (const order of activeOrders.value) {
    const key = getOrderDateKey(order)
    if (!key) continue
    if (!map.has(key)) {
      map.set(key, { date: key, totalHt: 0, totalTtc: 0, count: 0 })
    }
    const row = map.get(key)
    row.totalHt += Number(order?.total_products || 0)
    row.totalTtc += Number(order?.total_paid || order?.total_products_wt || 0)
    row.count += 1
  }

  return Array.from(map.values()).sort((a, b) => (a.date < b.date ? 1 : -1))
})

function formatPrice(value) {
  const num = Number(value || 0)
  return `${num.toFixed(2)} ${DEFAULT_CURRENCY_NAME}`
}

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
  align-items: center;
  gap: 12px;
  margin-bottom: 24px;
}

.filters-container input {
  max-width: 200px; /* Évite que l'input prenne 100% de la largeur */
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
