<template>
  <section class="address-section">
    <header class="header">
      <h1>Mon adresse</h1>
      <RouterLink to="/fo/products" class="btn btn-secondary">Retour aux produits</RouterLink>
    </header>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="loading">Chargement...</p>

    <div v-if="!loading && !customer" class="card">
      <p>Veuillez vous connecter pour voir votre adresse.</p>
      <RouterLink to="/fo/login" class="btn btn-primary">Se connecter</RouterLink>
    </div>

    <div v-else-if="!loading && addresses.length" class="card">
      <div v-for="addr in addresses" :key="addr.id" class="address-card">
        <h3>{{ addr.alias }}</h3>
        <p>{{ addr.firstname }} {{ addr.lastname }}</p>
        <p>{{ addr.address1 }} {{ addr.address2 }}</p>
        <p>{{ addr.postcode }} {{ addr.city }}</p>
        <p v-if="addr.phone">Tel: {{ addr.phone }}</p>
        <p v-if="addr.phone_mobile">Mobile: {{ addr.phone_mobile }}</p>
      </div>
      <RouterLink to="/fo/address/create" class="btn btn-secondary">Ajouter une autre adresse</RouterLink>
    </div>
  </section>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getAddressesByCustomer } from '../../service/addressService.js'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const addresses = ref([])
const customer = ref(null)

async function loadAddresses() {
  error.value = ''
  loading.value = true

  try {
    const stored = JSON.parse(localStorage.getItem('customer') || 'null')
    customer.value = stored

    if (!stored?.id) {
      addresses.value = []
      return
    }

    const list = await getAddressesByCustomer(stored.id)
    addresses.value = list

    if (!list.length) {
      router.push('/fo/address/create')
    }
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadAddresses()
})
</script>

<style scoped>
.address-section {
  padding: 16px;
  max-width: 800px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  padding: 16px;
}

.address-card {
  border: 1px solid #eee;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 12px;
}

.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  text-decoration: none;
  display: inline-block;
  margin-top: 10px;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn-primary {
  background: #3f51b5;
  color: #fff;
}

.error-msg {
  color: #d32f2f;
  background-color: #ffebee;
  padding: 10px;
  border-radius: 4px;
}
</style>
