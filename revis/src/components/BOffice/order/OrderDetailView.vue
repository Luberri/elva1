<script setup>
import { ref, watchEffect } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getOrderDetail, updateOrder } from '../../../service/orderService.js'
import { DEFAULT_CURRENCY_NAME } from '../../../api/util.js'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const successMsg = ref('')
const order = ref(null)
const currencyName = DEFAULT_CURRENCY_NAME

watchEffect(async () => {
    const id = route.params.id
    if (!id) return

    loading.value = true
    error.value = ''
    successMsg.value = ''

    try {
        order.value = await getOrderDetail(id)
    } catch (e) {
        error.value = e?.message || String(e)
    } finally {
        loading.value = false
    }
})

async function onUpdate() {
	try {
		error.value = ''
		successMsg.value = ''
		loading.value = true
		
        await updateOrder(order.value.id, order.value)
        order.value = await getOrderDetail(order.value.id)
		
        successMsg.value = 'Commande modifiée avec succès !'
	} catch (e) {
		error.value = e?.message || String(e)
	} finally {
		loading.value = false
	}
}
</script>

<template>
  <section class="wrap">
    <header class="header">
      <h1>Détail Commande #{{ route.params.id }}</h1>
      <RouterLink to="/orders" class="btn btn-secondary">← Retour à la liste</RouterLink>
    </header>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>

    <div v-if="!loading && order" class="card">
      <form @submit.prevent="onUpdate">
        <div class="split-col">
            <div class="form-group">
                <label class="form-label">Référence</label>
                <input v-model="order.reference" type="text" class="form-control" disabled />
                <small>Non modifiable directement via l'API standard</small>
            </div>
            
            <div class="form-group">
                <label class="form-label">ID Client *</label>
                <input v-model="order.id_customer" type="number" class="form-control" required />
            </div>
            
            <div class="form-group">
                <label class="form-label">ID Panier *</label>
                <input v-model="order.id_cart" type="number" class="form-control" required />
            </div>
            <div class="form-group">
                <label class="form-label">Statut Actuel (ID)</label>
                <input v-model="order.current_state" type="number" class="form-control" />
            </div>
        </div>

        <div class="split-col">
            <div class="form-group">
                <label class="form-label">Total Payé *</label>
                <input v-model="order.total_paid" type="number" step="0.01" class="form-control" required />
            </div>
            
            <div class="form-group">
                <label class="form-label">Total Réellement Payé *</label>
                <input v-model="order.total_paid_real" type="number" step="0.01" class="form-control" required />
            </div>
            
            <div class="form-group">
                <label class="form-label">Total Produits *</label>
                <input v-model="order.total_products" type="number" step="0.01" class="form-control" required />
            </div>
            
            <div class="form-group">
                <label class="form-label">Méthode de Paiement *</label>
                <input v-model="order.payment" type="text" class="form-control" required />
            </div>
        </div>

        <div class="associations" v-if="order.orderRows && order.orderRows.length">
            <h3>Produits liés (Order Rows)</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>ID Produit</th>
                        <th>Nom</th>
                        <th>Qté</th>
                        <th>Prix U (TTC)</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="row in order.orderRows" :key="row.id">
                        <td>{{ row.product_id }}</td>
                        <td>{{ row.product_name }}</td>
                        <td>{{ row.product_quantity }}</td>
                        <td>{{ row.unit_price_tax_incl }} {{ currencyName }}</td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="actions">
          <button type="submit" class="btn btn-primary" :disabled="loading">
            {{ loading ? 'Enregistrement...' : 'Mettre à jour' }}
          </button>
        </div>
      </form>
    </div>

    <p v-if="loading && !order">Chargement…</p>
  </section>
</template>

<style scoped>
.wrap { padding: 16px; max-width: 800px; margin: 0 auto; }
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.card {
  padding: 16px;
  border: 1px solid #ddd;
  border-radius: 8px;
  margin-top: 10px;
}
.split-col {
    display: flex;
    flex-wrap: wrap;
    gap: 15px;
    margin-bottom: 15px;
}
.split-col .form-group {
    flex: 1;
    min-width: 200px;
}
.form-group {
	margin-bottom: 12px;
}
.form-group label {
	display: block;
	margin-bottom: 6px;
	font-weight: 500;
}
.actions {
	margin-top: 24px;
	display: flex;
	justify-content: flex-end;
}
.associations {
    margin-top: 30px;
    padding-top: 15px;
    border-top: 1px solid #ccc;
}
.error-msg {
	color: #dc3545;
	background: #f8d7da;
	padding: 10px;
	border-radius: 4px;
	margin-bottom: 15px;
}
.success-msg {
	color: #0f5132;
	background: #d1e7dd;
	padding: 10px;
	border-radius: 4px;
	margin-bottom: 15px;
}
</style>