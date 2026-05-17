<template>
  <section class="orders-section">
    <header class="header">
      <h1>Mes commandes</h1>
      <div class="actions">
        <RouterLink to="/fo/products" class="btn btn-secondary">Produits</RouterLink>
        <RouterLink to="/fo/cart" class="btn btn-secondary">Mon panier</RouterLink>
      </div>
    </header>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="loading">Chargement...</p>

    <div v-if="!loading && !customerId" class="empty">
      <p>Connectez-vous pour voir vos commandes.</p>
      <RouterLink to="/fo/login" class="btn btn-primary">Se connecter</RouterLink>
    </div>

    <table v-if="!loading && orders.length" class="table">
      <thead>
        <tr>
            <th>ID</th>
          <th>Reference</th>
          <th>Date</th>
          <th>Total</th>
          <th>Etat</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="order in orders" :key="order.id">
          <td>
            <RouterLink
              :to="{ name: 'fo-order-detail', params: { id: order.id } }"
              class="link"
            >
              {{ order.id }}
            </RouterLink>
          </td>
          <td>{{ order.reference || order.id }}</td>
          <td>{{ formatDate(order.date_add) }}</td>
          <td>{{ formatPrice(order.total_paid) }}</td>
          <td>{{ getStateName(order.current_state) }}</td>
        </tr>
      </tbody>
    </table>

    <p v-else-if="!loading && customerId">Aucune commande.</p>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAllOrders, getAllOrderStates } from '../../service/orderService.js'
import { DEFAULT_CURRENCY_NAME } from '../../api/util.js'

const loading = ref(false)
const error = ref('')
const orders = ref([])
const stateMap = ref(new Map())
const customerId = ref('')

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

async function loadOrders() {
  error.value = ''
  loading.value = true

  try {
    const stored = JSON.parse(localStorage.getItem('customer') || 'null')
    customerId.value = stored?.id ? String(stored.id) : ''

    if (!customerId.value) {
      orders.value = []
      return
    }

    const states = await getAllOrderStates({ filters: {} })
    stateMap.value = new Map(states.map(s => [String(s.id), s]))

    const list = await getAllOrders({
      filters: {
        id_customer: `[${customerId.value}]`
      }
    })

    orders.value = list
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadOrders()
})
</script>

<style scoped>
.orders-section {
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.actions {
  display: flex;
  gap: 10px;
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

.link {
  color: #2c3e50;
  font-weight: 600;
  text-decoration: none;
}

.link:hover {
  text-decoration: underline;
}

.empty {
  background: #fff;
  border-radius: 8px;
  padding: 16px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
}
</style>
