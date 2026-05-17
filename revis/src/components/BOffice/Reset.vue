<template>
  <div class="reset-container">
    <h2>Zone de danger : Réinitialisation</h2>
    
    <div class="card warning-card">
      <p>
        ⚠️ <strong>ATTENTION :</strong> Cette action est <strong>IRRÉVERSIBLE</strong>. <br/>
        En cliquant sur ce bouton, vous supprimerez la totalité des produits, catégories, taxes, commandes, clients et images de la boutique.
      </p>
      
      <button @click="handleReset" class="btn btn-danger" :disabled="loading">
        {{ loading ? 'Suppression en cours (cela peut prendre du temps)...' : '💣 Réinitialiser toutes les données' }}
      </button>
    </div>
    <br>
    <button class="btn btn-primary">
      <RouterLink style="color: black;" to="/import-all">importer</RouterLink>
    </button>

    <!-- Rapport de suppression -->
    <div v-if="report" class="result card mt-3">
      <h3>📋 Rapport de suppression</h3>
      <ul class="report-list">
        <li v-for="(count, resource) in report" :key="resource">
          <span class="resource-name">{{ resource }}</span> : 
          <span class="resource-count" :class="{ 'text-danger': String(count).includes('Erreur') }">
            <strong>{{ count }}</strong>
          </span>
        </li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { resetAllData } from '../../service/resetService'

const loading = ref(false)
const report = ref(null)

const handleReset = async () => {
  // Double vérification par sécurité
  const isConfirmed = window.confirm(
    "Êtes-vous absolument sûr de vouloir TOUT supprimer ? Cette action est totalement irréversible."
  )
  
  if (!isConfirmed) return

  loading.value = true
  report.value = null

  try {
    const res = await resetAllData()
    report.value = res
  } catch (err) {
    alert("Une erreur inattendue est survenue : " + err.message)
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.reset-container {
  padding: 20px;
  max-width: 800px;
  margin: 0 auto;
}

.card {
  background: #fff;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.warning-card {
  border-left: 5px solid #d32f2f;
  background-color: #fffaf0;
}

.warning-card p {
  color: #c62828;
  font-size: 1.1rem;
  line-height: 1.5;
}

.mt-3 {
  margin-top: 1.5rem;
}

.btn {
  padding: 12px 20px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
  font-weight: bold;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-danger {
  background-color: #d32f2f;
  color: white;
  transition: background-color 0.2s;
  width: 100%;
}

.btn-danger:hover:not(:disabled) {
  background-color: #b71c1c;
}

.btn:disabled {
  background-color: #e57373;
  cursor: not-allowed;
  opacity: 0.8;
}

.result {
  background-color: #f5f5f5;
  border-left: 5px solid #4caf50;
}

.report-list {
  list-style-type: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 10px;
}

.report-list li {
  background: white;
  padding: 10px;
  border-radius: 4px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.1);
  display: flex;
  justify-content: space-between;
}

.resource-name {
  color: #555;
  font-family: monospace;
}

.text-danger {
  color: #d32f2f;
}
</style>