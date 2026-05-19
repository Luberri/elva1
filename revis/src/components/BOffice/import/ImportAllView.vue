<template>
  <div class="import-container">
    <h2>Import complet (CSV1 + CSV2 + CSV3 + Images)</h2>

    <div class="card">
      <p>Selectionnez CSV1, CSV2, CSV3. Le ZIP images est optionnel.</p>

      <div class="form-group">
        <label class="form-label">CSV1 (produits)</label>
        <input type="file" accept=".csv" @change="onCsv1Change" :disabled="loading" />
      </div>
      <div class="form-group">
        <label class="form-label">CSV2 (declinaisons)</label>
        <input type="file" accept=".csv" @change="onCsv2Change" :disabled="loading" />
      </div>
      <div class="form-group">
        <label class="form-label">CSV3 (commandes)</label>
        <input type="file" accept=".csv" @change="onCsv3Change" :disabled="loading" />
      </div>
      <div class="form-group">
        <label class="form-label">ZIP images (optionnel)</label>
        <input type="file" accept=".zip" @change="onZipChange" :disabled="loading" />
      </div>

      <button @click="startImport" :disabled="!ready || loading" class="btn btn-primary mt-3">
        {{ loading ? 'Importation en cours...' : 'Lancer l\'import complet' }}
      </button>
    </div>

    <div v-if="error" class="alert alert-danger mt-3">
      <p>Erreur: {{ error.message || error }}</p>
      <template v-if="error.line">
        <p>Ligne: <strong>{{ error.line }}</strong></p>
      </template>
      <template v-if="error.details && error.details.length">
        <ul>
          <li v-for="(d, i) in error.details" :key="i">{{ d }}</li>
        </ul>
      </template>
      <button @click="handleReset" :disabled="resetting" class="btn btn-secondary mt-3">
        {{ resetting ? 'Reset en cours...' : 'Reset' }}
      </button>
    </div>

    <div v-if="result" class="result card mt-3">
      <h3>Rapport d'importation</h3>
      <p>CSV1 - Categories: <strong>{{ result.csv1?.categoriesCreated ?? 0 }}</strong></p>
      <p>CSV1 - Taxes: <strong>{{ result.csv1?.taxesCreated ?? 0 }}</strong></p>
      <p>CSV1 - Produits: <strong>{{ result.csv1?.productsCreated ?? 0 }}</strong></p>
      <p>CSV2 - Declinaisons: <strong>{{ result.csv2?.combinationsCreated ?? 0 }}</strong></p>
      <p>CSV2 - Stocks: <strong>{{ result.csv2?.stocksUpdated ?? 0 }}</strong></p>
      <p>CSV3 - Clients: <strong>{{ result.csv3?.customersCreated ?? 0 }}</strong></p>
      <p>CSV3 - Adresses: <strong>{{ result.csv3?.addressesCreated ?? 0 }}</strong></p>
      <p>CSV3 - Paniers: <strong>{{ result.csv3?.cartsCreated ?? 0 }}</strong></p>
      <p>CSV3 - Commandes: <strong>{{ result.csv3?.ordersCreated ?? 0 }}</strong></p>
      <p>CSV3 - Paiements: <strong>{{ result.csv3?.paymentsCreated ?? 0 }}</strong></p>
      <template v-if="result.images">
        <p>Images - Uploadees: <strong>{{ result.images?.uploaded ?? 0 }}</strong></p>
        <p>Images - Ignorees: <strong>{{ result.images?.skipped ?? 0 }}</strong></p>
        <p v-if="result.images?.missing?.length">Images - Sans produit: <strong>{{ result.images.missing.length }}</strong></p>
        <p v-if="result.images?.errors?.length">Images - Erreurs: <strong>{{ result.images.errors.length }}</strong></p>
      </template>
      <template v-if="result.csv1?.errors?.length">
        <h4>Erreurs CSV1</h4>
        <ul>
          <li v-for="(e, i) in result.csv1.errors" :key="i">{{ e }}</li>
        </ul>
      </template>
      <template v-if="result.csv2?.errors?.length">
        <h4>Erreurs CSV2</h4>
        <ul>
          <li v-for="(e, i) in result.csv2.errors" :key="i">{{ e }}</li>
        </ul>
      </template>
      <template v-if="result.csv3?.errors?.length">
        <h4>Erreurs CSV3</h4>
        <ul>
          <li v-for="(e, i) in result.csv3.errors" :key="i">{{ e }}</li>
        </ul>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import { importAllData } from '../../../service/import/importServiceAll.js'
import { resetAllData } from '../../../service/resetService.js'

const csv1File = ref(null)
const csv2File = ref(null)
const csv3File = ref(null)
const zipFile = ref(null)
const loading = ref(false)
const error = ref('')
const result = ref(null)
const resetting = ref(false)

const ready = computed(() => csv1File.value && csv2File.value && csv3File.value)

const onCsv1Change = (e) => { csv1File.value = e.target.files[0] || null }
const onCsv2Change = (e) => { csv2File.value = e.target.files[0] || null }
const onCsv3Change = (e) => { csv3File.value = e.target.files[0] || null }
const onZipChange = (e) => { zipFile.value = e.target.files[0] || null }

const readFileAsText = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader()
  reader.onload = (e) => resolve(e.target.result)
  reader.onerror = () => reject(new Error('Erreur de lecture du fichier.'))
  reader.readAsText(file)
})

const startImport = async () => {
  if (!ready.value) return

  loading.value = true
  error.value = ''
  result.value = null

  try {
    const [csv1Text, csv2Text, csv3Text] = await Promise.all([
      readFileAsText(csv1File.value),
      readFileAsText(csv2File.value),
      readFileAsText(csv3File.value)
    ])

    const res = await importAllData({
      csv1Text,
      csv2Text,
      csv3Text,
      zipFile: zipFile.value
    })

    result.value = res
    } catch (err) {
    if (err && typeof err === 'object') {
      error.value = err
    } else {
      error.value = { message: String(err) }
    }
  } finally {
    loading.value = false
  }
}

const handleReset = async () => {
  resetting.value = true
  try {
    await resetAllData()
  } catch (err) {
    error.value = { message: 'Erreur reset : ' + (err?.message || String(err)) }
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
  display: flex;
  flex-direction: column;
  gap: 6px;
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
  background: #607d8b;
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
