<template>
  <div class="import-container">
    <h2>Importer des images (ZIP)</h2>

    <div class="card">
      <p>Selectionnez un fichier .zip contenant des images nommees par reference produit.</p>
      <p><small>Ex: ABC123.jpg, DEF456.png</small></p>

      <div class="form-group">
        <input type="file" id="zipFile" accept=".zip" @change="onFileChange" :disabled="loading" />
      </div>

      <button @click="startImport" :disabled="!file || loading" class="btn btn-primary mt-3">
        {{ loading ? 'Importation en cours...' : 'Lancer l\'importation' }}
      </button>
    </div>

    <div v-if="error" class="alert alert-danger mt-3">{{ error }}</div>

    <div v-if="result" class="result card mt-3">
      <h3>Rapport d'importation</h3>
      <p>✅ Images chargees : <strong>{{ result.uploaded }}</strong></p>
      <p>⏭️ Fichiers ignores : <strong>{{ result.skipped }}</strong></p>

      <div v-if="result.missing && result.missing.length" class="errors mt-3">
        <h4>⚠️ References sans produit ({{ result.missing.length }}) :</h4>
        <ul>
          <li v-for="(ref, index) in result.missing" :key="index">{{ ref }}</li>
        </ul>
      </div>

      <div v-if="result.errors && result.errors.length" class="errors mt-3">
        <h4>⚠️ Erreurs d'upload ({{ result.errors.length }}) :</h4>
        <ul>
          <li v-for="(err, index) in result.errors" :key="index">{{ err }}</li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { importImagesFromZip } from '../../../service/import/importIMage.js'

const file = ref(null)
const loading = ref(false)
const error = ref('')
const result = ref(null)

const onFileChange = (e) => {
  file.value = e.target.files[0] || null
}

const startImport = async () => {
  if (!file.value) return

  loading.value = true
  error.value = ''
  result.value = null

  try {
    const res = await importImagesFromZip(file.value)
    result.value = res
  } catch (err) {
    error.value = "Erreur lors de l'import : " + (err.message || String(err))
  } finally {
    loading.value = false
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
  background: #4CAF50;
  color: #fff;
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
