<template>
  <section class="order-detail">
    <header class="header">
      <h1>Commande #{{ orderId }}</h1>
      <RouterLink to="/fo/orders" class="btn btn-secondary">Retour aux commandes</RouterLink>
    </header>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="loading">Chargement...</p>

    <div v-if="!loading && !customerId" class="empty">
      <p>Connectez-vous pour voir cette commande.</p>
      <RouterLink to="/fo/login" class="btn btn-primary">Se connecter</RouterLink>
    </div>

    <div v-else-if="!loading && order" class="card">
      <div class="grid">
        <div>
          <label class="label">Reference</label>
          <div class="value">{{ order.reference || '-' }}</div>
        </div>
        <div>
          <label class="label">Date</label>
          <div class="value">{{ formatDate(order.date_add) }}</div>
        </div>
        <div>
          <label class="label">Total paye</label>
          <div class="value">{{ formatPrice(order.total_paid) }}</div>
        </div>
        <div>
          <label class="label">Etat</label>
          <div class="value">{{ getStateName(order.current_state) }}</div>
        </div>
      </div>

      <div v-if="order.orderRows && order.orderRows.length" class="rows">
        <h2>Produits</h2>
        <table class="table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Quantite</th>
              <th>Prix U</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in order.orderRows" :key="row.id">
              <td>{{ row.product_name || row.product_id }}</td>
              <td>{{ row.product_quantity }}</td>
              <td>{{ formatPrice(row.unit_price_tax_incl) }}</td>
              <td>{{ formatPrice(getRowTotal(row)) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <p v-else-if="!loading && customerId && !order">Commande introuvable.</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getAllOrderStates, getOrderDetail } from '../../service/orderService.js'
import { DEFAULT_CURRENCY_NAME } from '../../api/util.js'

const route = useRoute()
const loading = ref(false)
const error = ref('')
const order = ref(null)
const stateMap = ref(new Map())
const customerId = ref('')

const orderId = computed(() => String(route.params.id || ''))

function formatDate(value) {
  if (!value) return '-'
  return String(value).split(' ')[0]
}

function formatPrice(value) {
  const num = parseFloat(String(value).replace(',', '.'))
  if (!Number.isFinite(num)) return '-'
  return `${num.toFixed(2)} ${DEFAULT_CURRENCY_NAME}`
}

function getStateName(stateId) {
  const state = stateMap.value.get(String(stateId))
  return state?.name || stateId || '-'
}

function getRowTotal(row) {
  const qty = Number(row?.product_quantity || 0)
  const unit = parseFloat(String(row?.unit_price_tax_incl || 0).replace(',', '.'))
  const total = qty * (Number.isFinite(unit) ? unit : 0)
  return Number.isFinite(total) ? total : 0
}

async function loadOrder() {
  error.value = ''
  loading.value = true

  try {
    const stored = JSON.parse(localStorage.getItem('customer') || 'null')
    customerId.value = stored?.id ? String(stored.id) : ''

    if (!customerId.value) {
      order.value = null
      return
    }

    const states = await getAllOrderStates({ filters: {} })
    stateMap.value = new Map(states.map(s => [String(s.id), s]))

    const detail = await getOrderDetail(orderId.value)
    if (!detail) {
      order.value = null
      return
    }

    if (String(detail.id_customer || '') !== customerId.value) {
      order.value = null
      error.value = 'Acces refuse.'
      return
    }

    order.value = detail
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOrder()
})
</script>

<style scoped>
.order-detail {
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.card {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.label {
  display: block;
  font-size: 12px;
  color: #666;
  margin-bottom: 4px;
}

.value {
  font-weight: 600;
}

.rows {
  margin-top: 16px;
}

.table {
  width: 100%;
  border-collapse: collapse;
  background: #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}

.table th,
.table td {
  text-align: left;
  padding: 10px 12px;
  border-bottom: 1px solid #eee;
}

.empty {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
</style>
