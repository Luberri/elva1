<template>
  <div class="login-container">
    <div class="login-card">
      <h2>Connexion client</h2>
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label class="form-label" for="email">Adresse email</label>
          <input type="email" id="email" v-model="email" required placeholder="client@shop.com" value="rakoto@yopmail.com"/>
        </div>

        <div class="form-group">
          <label class="form-label" for="password">Mot de passe</label>
          <input type="password" id="password" v-model="password" required placeholder="Votre mot de passe" value="XvzsX5O0!GBD0uXQ"/>
        </div>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <button type="submit" :disabled="loading">
          {{ loading ? 'Connexion en cours...' : 'Se connecter' }}
        </button>
              <button type="button" class="btn-secondary" @click="handleAnonymous">
          Continuer en invite
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { loginCustomer } from '../../service/customerService.js'

const router = useRouter()
const email = ref('')
const password = ref('')
const error = ref('')
const loading = ref(false)

const handleLogin = async () => {
  error.value = ''
  loading.value = true

  try {
    const customer = await loginCustomer(email.value, password.value)

    if (customer) {
      localStorage.setItem('customer', JSON.stringify(customer))
      router.push('/fo/products')
    }
  } catch (err) {
    error.value = err.message || 'Erreur lors de la connexion.'
  } finally {
    loading.value = false
  }
}

const handleAnonymous = () => {
  localStorage.setItem('customer', JSON.stringify({ is_anonymous: true }))
  router.push('/fo/products')
}
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.login-card {
  background: white;
  padding: 2.5rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h2 {
  text-align: center;
  margin-bottom: 1.5rem;
  color: #333;
}

.form-group {
  margin-bottom: 1rem;
}

label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 600;
  color: #555;
}

input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
}

input:focus {
  outline: none;
  border-color: #3f51b5;
  box-shadow: 0 0 0 2px rgba(63, 81, 181, 0.2);
}

button {
  width: 100%;
  padding: 0.75rem;
  background-color: #3f51b5;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  cursor: pointer;
  margin-top: 1rem;
}

.btn-secondary {
  background-color: #e0e0e0;
  color: #333;
}

.btn-secondary:hover:not(:disabled) {
  background-color: #d5d5d5;
}

button:hover:not(:disabled) {
  background-color: #3646a3;
}

button:disabled {
  background-color: #cccccc;
  cursor: not-allowed;
}

.error-message {
  color: #d32f2f;
  background-color: #ffebee;
  padding: 0.75rem;
  border-radius: 4px;
  margin-bottom: 1rem;
  font-size: 0.9rem;
  text-align: center;
}
</style>



