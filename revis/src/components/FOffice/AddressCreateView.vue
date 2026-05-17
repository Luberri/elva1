<template>
  <section class="address-section">
    <header class="header">
      <h1>Ajouter une adresse</h1>
      <RouterLink to="/fo/products" class="btn btn-secondary">Retour aux produits</RouterLink>
    </header>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="success" class="success-msg">{{ success }}</p>

    <form class="card" @submit.prevent="handleSubmit">
      <div class="row">
        <div class="form-group">
          <label class="form-label">Alias *</label>
          <input v-model="form.alias" required />
        </div>
        <div class="form-group">
          <label class="form-label">ID Pays *</label>
          <input v-model="form.id_country" type="number" required />
        </div>
      </div>

      <div class="row">
        <div class="form-group">
          <label class="form-label">Prenom *</label>
          <input v-model="form.firstname" required />
        </div>
        <div class="form-group">
          <label class="form-label">Nom *</label>
          <input v-model="form.lastname" required />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">Adresse *</label>
        <input v-model="form.address1" required />
      </div>

      <div class="row">
        <div class="form-group">
          <label class="form-label">Code postal</label>
          <input v-model="form.postcode" />
        </div>
        <div class="form-group">
          <label class="form-label">Ville *</label>
          <input v-model="form.city" required />
        </div>
      </div>

      <div class="row">
        <div class="form-group">
          <label class="form-label">Telephone</label>
          <input v-model="form.phone" />
        </div>
        <div class="form-group">
          <label class="form-label">Mobile</label>
          <input v-model="form.phone_mobile" />
        </div>
      </div>

      <div class="actions">
        <button class="btn btn-primary" type="submit" :disabled="loading">
          {{ loading ? 'Enregistrement...' : 'Enregistrer' }}
        </button>
      </div>
    </form>
  </section>
</template>

<script setup>
import { ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { createAddress } from '../../service/addressService.js'
import { DEFAULT_COUNTRY_ID } from '../../api/util.js'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const success = ref('')

const form = ref({
  alias: '',
  id_country: DEFAULT_COUNTRY_ID,
  firstname: '',
  lastname: '',
  address1: '',
  postcode: '',
  city: '',
  phone: '',
  phone_mobile: ''
})

async function handleSubmit() {
  error.value = ''
  success.value = ''
  loading.value = true

  try {
    const customer = JSON.parse(localStorage.getItem('customer') || 'null')
    if (!customer?.id) throw new Error('Client non connecte')

    await createAddress({
      ...form.value,
      id_customer: customer.id
    })

    success.value = 'Adresse ajoutee.'
    router.push('/fo/address')
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}
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

.row {
  display: flex;
  gap: 12px;
  margin-bottom: 12px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 6px;
  font-weight: 600;
}

.form-group input {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  text-decoration: none;
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
  margin-bottom: 10px;
}

.success-msg {
  color: #0f5132;
  background: #d1e7dd;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 10px;
}
</style>
