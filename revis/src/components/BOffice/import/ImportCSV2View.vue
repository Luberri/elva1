<template>
  <div class="import-container">
    <h2>Importer des déclinaisons & stocks (CSV 2)</h2>
    
    <div class="card">
      <p>Sélectionnez un fichier .csv contenant les déclinaisons (reference, specificité, karazany, stock_initial, prix_vente_ttc).</p>
      <p><small><b>Attention :</b> Les produits principaux doivent déjà exister dans la boutique avant d'importer leurs déclinaisons.</small></p>
      
      <div class="form-group">
        <input type="file" id="csvFile2" accept=".csv" @change="onFileChange" :disabled="loading" />
      </div>
      
      <button @click="startImport" :disabled="!file || loading" class="btn btn-primary mt-3">
        {{ loading ? 'Importation en cours...' : 'Lancer l\'importation (Fichier 2)' }}
      </button>
    </div>

    <div v-if="error" class="alert alert-danger mt-3">
      <p>{{ error }}</p>
      <button @click="handleReset" :disabled="resetting" class="btn btn-secondary mt-3">
        {{ resetting ? 'Reset en cours...' : 'Reset' }}
      </button>
    </div>

    <div v-if="result" class="result card mt-3">
      <h3>Rapport d'importation (Déclinaisons)</h3>
      <p>✅ Déclinaisons / Combinaisons créées : <strong>{{ result.combinationsCreated }}</strong></p>
      <p>✅ Stocks mis à jour : <strong>{{ result.stocksUpdated }}</strong></p>

      <div v-if="result.errors && result.errors.length" class="errors mt-3">
        <h4>⚠️ Erreurs rencontrées ({{ result.errors.length }}) :</h4>
        <ul>
          <li v-for="(err, index) in result.errors" :key="index">{{ err }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { importDataFromCSV2 } from '../../../service/import/importService2.js'
import { resetAllData } from '../../../service/resetService.js'

const file = ref(null)
const loading = ref(false)
const error = ref('')
const result = ref(null)
const resetting = ref(false)

const onFileChange = (e) => {
  file.value = e.target.files[0] || null
}

const startImport = () => {
  if (!file.value) return

  loading.value = true
  error.value = ''
  result.value = null

  const reader = new FileReader()
  
  reader.onload = async (e) => {
    try {
      const csvText = e.target.result
      const res = await importDataFromCSV2(csvText)
      result.value = res
    } catch (err) {
      error.value = "Erreur lors de l'import : " + err.message
    } finally {
      loading.value = false
    }
  }
  
  reader.onerror = () => {
    error.value = "Erreur de lecture du fichier."
    loading.value = false
  }
  
  // on lit le fichier en tant que texte
  reader.readAsText(file.value)
}

const handleReset = async () => {
  resetting.value = true
  try {
    await resetAllData()
  } catch (err) {
    error.value = 'Erreur reset : ' + (err?.message || String(err))
  } finally {
    resetting.value = false
  }
}
</script>

<style scoped>
.import-container {
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

.form-group {
  margin-top: 10px;
}

.mt-3 { 
  margin-top: 1rem; 
}

.btn {
  padding: 10px 15px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 1rem;
}

.btn-primary {
  background: #2196F3;
  color: #fff;
}

.btn-secondary {
  background: #e0e0e0;
  color: #333;
}

.btn:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.alert-danger {
  color: #721c24;
  background-color: #f8d7da;
  padding: 10px;
  border-radius: 4px;
}

.errors {
  color: #d32f2f;
  background-color: #ffebee;
  padding: 10px;
  border-radius: 4px;
}

.errors ul {
  margin: 0;
  padding-left: 20px;
}
</style>
