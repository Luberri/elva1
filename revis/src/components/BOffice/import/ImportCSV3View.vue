<template>
  <div class="import-container">
    <h2>Importer commandes (CSV 3)</h2>

    <div class="card">
      <p>Selectionnez un fichier .csv contenant: date, nom, email, pwd, adresse, achat, etat.</p>
      <p><small>Ex: achat = [("T_01";2;"kely"),("C_03";1;"")].</small></p>

      <div class="form-group">
        <input type="file" id="csvFile3" accept=".csv" @change="onFileChange" :disabled="loading" />
      </div>

      <button @click="startImport" :disabled="!file || loading" class="btn btn-primary mt-3">
        {{ loading ? 'Importation en cours...' : 'Lancer l\'importation (Fichier 3)' }}
      </button>
    </div>

    <div v-if="error" class="alert alert-danger mt-3">
      <p>{{ error }}</p>
      <button @click="handleReset" :disabled="resetting" class="btn btn-secondary mt-3">
        {{ resetting ? 'Reset en cours...' : 'Reset' }}
      </button>
    </div>

    <div v-if="result" class="result card mt-3">
      <h3>Rapport d'importation (Commandes)</h3>
      <p>✅ Clients crees : <strong>{{ result.customersCreated }}</strong></p>
      <p>✅ Adresses creees : <strong>{{ result.addressesCreated }}</strong></p>
      <p>✅ Paniers crees : <strong>{{ result.cartsCreated }}</strong></p>
      <p>✅ Commandes creees : <strong>{{ result.ordersCreated }}</strong></p>
      <p>✅ Paiements crees : <strong>{{ result.paymentsCreated }}</strong></p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { importDataFromCSV3 } from '../../../service/import/importService3.js'
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
      const res = await importDataFromCSV3(csvText)
      result.value = res
    } catch (err) {
      error.value = "Erreur lors de l'import : " + err.message
    } finally {
      loading.value = false
    }
  }

  reader.onerror = () => {
    error.value = 'Erreur de lecture du fichier.'
    loading.value = false
  }

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
  background: #ff9800;
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
</style>
