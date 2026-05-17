<script setup>
import { computed, ref, watchEffect } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getCartDetail, updateCart } from '../../../service/cartService.js'
import { getAllCustomers } from '../../../service/customerService.js'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const successMsg = ref('')
const cart = ref(null)
const customers = ref([])
watchEffect(async () => {
    const id = route.params.id
    if (!id) return

    loading.value = true
    error.value = ''
    successMsg.value = ''

    try {
        cart.value = await getCartDetail(id)
        customers.value = await getAllCustomers({ filters: {} });

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
        
        await updateCart(cart.value.id, cart.value)
        cart.value = await getCartDetail(cart.value.id)
        
        successMsg.value = 'Panier modifié avec succès !'
    } catch (e) {
        error.value = e?.message || String(e)
    } finally {
        loading.value = false
    }
}
// console.log(getAllCustomers())
const customerList = computed(() => customers.value)
</script>

<template>
  <section class="wrap">
    <header class="header">
      <h1>Détail Panier #{{ route.params.id }}</h1>
      <RouterLink to="/carts" class="btn btn-secondary">← Retour à la liste</RouterLink>
    </header>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>

    <div v-if="!loading && cart" class="card">
      <form @submit.prevent="onUpdate">
        <div class="split-col">
            <!-- <div class="form-group">
                <label class="form-label">ID Client</label>
                <input v-model="cart.id_customer" type="number" class="form-control" />
            </div> -->
            <select v-model="cart.id_customer" name="client">
                <option v-for="c in customerList" value="c.id">{{ c.firstname }} {{ c.lastname }}</option>
            </select>
            
            <div class="form-group">
                <label class="form-label">ID Devise *</label>
                <input v-model="cart.id_currency" type="number" class="form-control" required />
            </div>

            <div class="form-group">
                <label class="form-label">ID Langue *</label>
                <input v-model="cart.id_lang" type="number" class="form-control" required />
            </div>
        </div>

        <div class="split-col">
            <div class="form-group">
                <label class="form-label">ID Adresse de livraison</label>
                <input v-model="cart.id_address_delivery" type="number" class="form-control" />
            </div>
            
            <div class="form-group">
                <label class="form-label">ID Adresse de facturation</label>
                <input v-model="cart.id_address_invoice" type="number" class="form-control" />
            </div>
        </div>

        <div class="associations" v-if="cart.cartRows && cart.cartRows.length">
            <h3>Produits dans le panier (Cart Rows)</h3>
            <table class="table">
                <thead>
                    <tr>
                        <th>ID Produit</th>
                        <th>ID Attribut Produit</th>
                        <th>Qté</th>
                        <th>ID Adresse Livraison</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="(row, idx) in cart.cartRows" :key="idx">
                        <td>{{ row.id_product }}</td>
                        <td>{{ row.id_product_attribute }}</td>
                        <td>{{ row.quantity }}</td>
                        <td>{{ row.id_address_delivery }}</td>
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

    <p v-if="loading && !cart">Chargement…</p>
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