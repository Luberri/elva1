<script setup>
import { ref, watchEffect } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getProductDetail, updateProduct } from '../../../service/productService.js'
import { getStockDetail, updateStock, getAllStocks } from '../../../service/stockService.js'
import { getCombinationsByProduct, updateCombination } from '../../../service/combinationService.js'
import { uploadImage, getImageUrl } from '../../../service/imageService.js'
import Editor from '@tinymce/tinymce-vue'

const route = useRoute()
const router = useRouter()

const loading = ref(false)
const error = ref('')
const product = ref(null)
const successMsg = ref('')
const combinations = ref([])
const combinationsLoading = ref(false)

const selectedFiles = ref([])

// Pour le stock principal du produit
const productStockAdjustment = ref(0)

function parseNumberInput(value, fallback = 0) {
  const num = Number(String(value ?? '').replace(',', '.'))
  return Number.isFinite(num) ? num : fallback
}

function onFileSelected(event) {
  const files = event.target.files
  if (files && files.length > 0) {
    selectedFiles.value = Array.from(files)
  } else {
    selectedFiles.value = []
  }
}

// Fonctions d'ajustement JavaScript pour le stock global
function adjustProductStock(amount) {
  if (!product.value) return
  const currentStock = Number(product.value.quantity) || 0
  product.value.quantity = Math.max(0, currentStock + amount)
}

// Fonctions d'ajustement JavaScript pour les declinaisons
function adjustCombinationStock(index, amount) {
  const row = combinations.value[index]
  if (!row) return
  const currentStock = Number(row.quantity) || 0
  row.quantity = Math.max(0, currentStock + amount)
}

// chargement auto quand id change
watchEffect(async () => {
  const id = route.params.id
  if (!id) return

  loading.value = true
  error.value = ''
  successMsg.value = ''
  selectedFiles.value = []
  productStockAdjustment.value = 0

  try {
    const data = await getProductDetail(id)
    let stockQuantity = 0
    if (data.stockAvailableId) {
      const stockInfo = await getStockDetail(data.stockAvailableId)
      if (stockInfo) {
        stockQuantity = Number(stockInfo.quantity) || 0
      }
    }

    product.value = { ...data, active: data.active === '1', quantity: stockQuantity }

    combinationsLoading.value = true
    const [combList, stockList] = await Promise.all([
      getCombinationsByProduct(id),
      getAllStocks({ filters: { id_product: id } })
    ])

    combinations.value = combList.map((comb) => {
      const stock = stockList.find(
        (s) => String(s.id_product_attribute || '0') === String(comb.id)
      )

      return {
        id: String(comb.id),
        id_product: String(comb.id_product || id),
        reference: comb.reference || '',
        minimal_quantity: parseNumberInput(comb.minimal_quantity, 1),
        price: parseNumberInput(comb.price, 0),
        quantity: parseNumberInput(stock?.quantity, 0),
        weight: parseNumberInput(comb.weight, 0),
        available_date: comb.available_date || '',
        default_on: !!comb.default_on,
        associations: comb.associations || null,
        stockId: stock?.id || null,
        saving: false,
        error: '',
        adjustment: 0
      }
    })
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    combinationsLoading.value = false
    loading.value = false
  }
})

async function onUpdate() {
  try {
    error.value = ''
    successMsg.value = ''
    loading.value = true

    // Mise a jour classique du produit
    await updateProduct(product.value.id, product.value)

    if (product.value.stockAvailableId) {
      await updateStock(product.value.stockAvailableId, {
        id_product: product.value.id,
        quantity: product.value.quantity,
        depends_on_stock: 0,
        out_of_stock: 2
      })
    }

    // Si de nouvelles images ont ete selectionnees, les uploader sur ce produit
    if (selectedFiles.value.length > 0) {
      for (const file of selectedFiles.value) {
        await uploadImage('products', product.value.id, file)
      }
      // On recharge les donnees pour afficher la nouvelle image si elle est dans `product.image`
      const data = await getProductDetail(product.value.id)
      let stockQuantity = product.value.quantity
      if (data.stockAvailableId && data.stockAvailableId !== product.value.stockAvailableId) {
        const stockInfo = await getStockDetail(data.stockAvailableId)
        if (stockInfo) stockQuantity = Number(stockInfo.quantity) || 0
      }
      product.value = { ...data, active: data.active === '1', quantity: stockQuantity }
      selectedFiles.value = []
    }

    productStockAdjustment.value = 0
    successMsg.value = 'Produit modifie avec succes !'
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

async function onUpdateCombination(index) {
  const row = combinations.value[index]
  if (!row || !product.value?.id) return

  row.error = ''
  row.saving = true
  successMsg.value = ''
  error.value = ''

  try {
    await updateCombination(row.id, {
      id_product: product.value.id,
      minimal_quantity: parseNumberInput(row.minimal_quantity, 1),
      reference: row.reference || '',
      quantity: parseNumberInput(row.quantity, 0),
      price: parseNumberInput(row.price, 0),
      weight: parseNumberInput(row.weight, 0),
      available_date: row.available_date || undefined,
      default_on: row.default_on,
      associations: row.associations || undefined
    })

    if (row.stockId) {
      await updateStock(row.stockId, {
        id_product: product.value.id,
        id_product_attribute: row.id,
        quantity: parseNumberInput(row.quantity, 0),
        depends_on_stock: 0,
        out_of_stock: 2
      })
    }

    row.adjustment = 0
    successMsg.value = `Declinaison ${row.reference || '#' + row.id} mise a jour avec succes !`
  } catch (e) {
    row.error = e?.message || String(e)
  } finally {
    row.saving = false
  }
}
</script>

<template>
  <section class="wrap">
    <header class="header">
      <h1>Modification Produit {{ route.params.id }}</h1>
      <RouterLink to="/" class="btn btn-secondary">← Retour</RouterLink>
    </header>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="successMsg" class="success-msg">{{ successMsg }}</p>

    <div v-if="!loading && product" class="main-layout">
      <div class="card product-block">
        <form @submit.prevent="onUpdate">
          <div class="form-group">
            <label class="form-label">Nom du produit</label>
            <input v-model="product.titre" type="text" class="form-control" required />
          </div>

          <div class="form-group">
            <label class="form-label">Reference</label>
            <input v-model="product.reference" type="text" class="form-control" />
          </div>

          <div class="form-group">
            <label class="form-label">Prix HT</label>
            <input v-model="product.price" type="number" step="0.01" class="form-control" required />
          </div>

          <div class="form-group">
            <label class="form-label">ID Categorie par defaut</label>
            <input v-model="product.categorieId" type="number" class="form-control" required />
          </div>

          <div class="form-group">
            <label class="form-label">Quantite en Stock</label>
            <div class="stock-input-wrapper">
              <input v-model.number="product.quantity" type="number" class="form-control" />

              <div class="stock-calculator">
                <input
                  v-model.number="productStockAdjustment"
                  type="number"
                  class="form-control calc-input"
                  placeholder="Valeur"
                  min="0"
                />
                <button type="button" class="btn-calc btn-add" @click="adjustProductStock(productStockAdjustment)">
                  + Ajouter
                </button>
                <button type="button" class="btn-calc btn-sub" @click="adjustProductStock(-productStockAdjustment)">
                  - Soustraire
                </button>
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Nouvelles images du produit (.png, .jpg)</label>
            <input type="file" @change="onFileSelected" accept="image/png, image/jpeg" class="form-control" multiple />
            <div v-if="selectedFiles.length > 0" style="margin-top: 5px; font-size: 13px; color: #666;">
              {{ selectedFiles.length }} fichier(s) selectionne(s)
            </div>
            <div v-if="product.images && product.images.length > 0" style="margin-top: 10px;">
              <p>Images actuelles :</p>
              <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                <img
                  v-for="imgId in product.images"
                  :key="imgId"
                  :src="getImageUrl('products', product.id, imgId)"
                  style="max-width: 150px; border: 1px solid #ccc; padding: 2px;"
                  :alt="'Image ' + imgId"
                />
              </div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Description courte (HTML)</label>
            <Editor
              v-model="product.descriptionShort"
              api-key="vfcu4k2lfnmswvve6zp614gzxwzv7nhsm4jkb1n4xg6h766f"
              :init="{ height: 250, menubar: false, plugins: 'lists link code', toolbar: 'undo redo | bold italic | bullist numlist | link code' }"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Description (HTML)</label>
            <Editor
              v-model="product.description"
              api-key="vfcu4k2lfnmswvve6zp614gzxwzv7nhsm4jkb1n4xg6h766f"
              :init="{ height: 400, menubar: false, plugins: 'lists link code', toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | link code' }"
            />
          </div>

          <div class="actions">
            <button type="submit" class="btn btn-primary" :disabled="loading">
              {{ loading ? 'Enregistrement...' : 'Mettre a jour' }}
            </button>
          </div>
        </form>
      </div>

      <div class="card declinaisons-block">
        <h2>Declinaisons</h2>
        <p v-if="combinationsLoading">Chargement des declinaisons...</p>
        <p v-else-if="combinations.length === 0" class="hint-msg">Aucune declinaison pour ce produit.</p>

        <div v-else class="declinaisons-list">
          <div v-for="(comb, index) in combinations" :key="comb.id" class="declinaison-card">
            <div class="declinaison-grid">
              <div>
                <label class="form-label">Reference</label>
                <input v-model="comb.reference" type="text" class="form-control" />
              </div>

              <div>
                <label class="form-label">Impact Prix HT</label>
                <input v-model.number="comb.price" type="number" step="0.01" class="form-control" />
              </div>

              <div>
                <label class="form-label">Stock (id: {{ comb.stockId }})</label>
                <input v-model.number="comb.quantity" type="number" class="form-control" />
              </div>
            </div>

            <div class="row-stock-calculator">
              <input
                v-model.number="comb.adjustment"
                type="number"
                class="form-control calc-input-sm"
                placeholder="Ajuster de..."
                min="0"
              />
              <button type="button" class="btn-calc btn-calc-sm btn-add" @click="adjustCombinationStock(index, comb.adjustment)">
                + Ajouter
              </button>
              <button type="button" class="btn-calc btn-calc-sm btn-sub" @click="adjustCombinationStock(index, -comb.adjustment)">
                - Soustraire
              </button>
            </div>

            <p v-if="comb.error" class="error-msg small-msg">{{ comb.error }}</p>

            <div class="actions small-actions">
              <button
                type="button"
                class="btn btn-primary"
                :disabled="comb.saving"
                @click="onUpdateCombination(index)"
              >
                {{ comb.saving ? 'Sauvegarde...' : 'Sauvegarder declinaison' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <p v-if="loading && !product">Chargement…</p>
  </section>
</template>

<style scoped>
.wrap { padding: 16px; max-width: 1200px; margin: 0 auto; }

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.main-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 24px;
  align-items: start;
}

.card {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
  border: 1px solid #e7e7e7;
}

.product-block {
  margin-top: 0;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.stock-input-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.stock-calculator {
  display: flex;
  gap: 6px;
}

.calc-input {
  max-width: 100px;
}

.btn-calc {
  border: none;
  padding: 6px 12px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
  font-size: 14px;
}

.row-stock-calculator {
  display: flex;
  gap: 6px;
  margin-top: 10px;
  background: #f1f1f1;
  padding: 6px;
  border-radius: 4px;
}

.calc-input-sm {
  max-width: 90px;
  height: 30px;
  font-size: 13px;
  padding: 2px 6px;
}

.btn-calc-sm {
  font-size: 12px;
  padding: 4px 8px;
}

.btn-add {
  background-color: #d1e7dd;
  color: #0f5132;
}

.btn-sub {
  background-color: #f8d7da;
  color: #dc3545;
}

.btn-calc:hover {
  opacity: 0.85;
}

.actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
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

.declinaisons-block {
  margin-top: 0;
  padding-top: 16px;
}

.declinaisons-block h2 {
  margin-top: 0;
  margin-bottom: 16px;
}

.declinaisons-list {
  display: grid;
  gap: 12px;
}

.declinaison-card {
  border: 1px solid #e7e7e7;
  border-radius: 8px;
  padding: 12px;
  background: #fafafa;
}

.declinaison-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.hint-msg {
  color: #666;
  margin: 0;
}

.small-actions {
  margin-top: 12px;
}

.small-msg {
  margin-top: 10px;
  margin-bottom: 0;
}

@media (max-width: 992px) {
  .main-layout {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 600px) {
  .declinaison-grid {
    grid-template-columns: 1fr;
  }
  .row-stock-calculator {
    flex-wrap: wrap;
  }
}
</style>