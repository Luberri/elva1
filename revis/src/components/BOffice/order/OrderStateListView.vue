<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAllOrderStates } from '../../../service/orderService.js'

const loading = ref(false)
const error = ref('')
const rows = ref([])

async function loadStates() {
  error.value = ''
  loading.value = true
  try {
    rows.value = await getAllOrderStates({ filters: {} })
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStates()
})

const stateList = computed(() => rows.value)
</script>

<template>
  <section class="list-section">
    <header class="header">
      <h1>Etats de commande</h1>
      <div class="actions">
        <RouterLink to="/orders" class="btn btn-secondary">Retour</RouterLink>
        <button class="btn btn-secondary" :disabled="loading" @click="loadStates">
          {{ loading ? 'Chargement…' : 'Recharger' }}
        </button>
      </div>
    </header>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="loading">Chargement…</p>

    <table v-else-if="stateList.length" class="table">
      <thead>
        <tr>
          <th>ID</th>
          <th>Nom</th>
          <th>Couleur</th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="s in stateList" :key="s.id">
          <td>{{ s.id }}</td>
          <td>{{ s.name || '-' }}</td>
          <td>
            <span class="color" :style="{ backgroundColor: s.color || '#fff' }"></span>
            <span class="color-code">{{ s.color || '-' }}</span>
          </td>
        </tr>
      </tbody>
    </table>
    <p v-else>Aucun etat disponible.</p>
  </section>
</template>

<style scoped>
.list-section { padding: 16px; }
.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}
.actions {
  display: flex;
  gap: 10px;
}
.color {
  display: inline-block;
  width: 14px;
  height: 14px;
  border-radius: 3px;
  border: 1px solid #ddd;
  vertical-align: middle;
  margin-right: 6px;
}
.color-code {
  color: #666;
}
</style>
