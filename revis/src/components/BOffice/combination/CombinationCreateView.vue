<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { createCombination } from '../../../service/combinationService.js'
import { getAllProducts, getPriceTtcWithImpact, parsePriceValue } from '../../../service/productService.js'
import { getAllProductOptionValues } from '../../../service/declinaisonService.js'
import { getTaxRateForGroup } from '../../../service/taxeService.js'

const router = useRouter()
const loading = ref(false)
const error = ref('')
const products = ref([])
const optionValues = ref([])
const selectedOptionValueIds = ref([])
const taxRate = ref(0)

const form = ref({
  id_product: '',
  reference: '',
  quantity: 0,
  price: 0,
  wholesale_price: 0,
  weight: 0,
  minimal_quantity: 1,
  default_on: false,
  available_date: ''
})

const selectedProduct = computed(() =>
  products.value.find(p => String(p.id) === String(form.value.id_product))
)

const baseHt = computed(() => parsePriceValue(selectedProduct.value?.price || 0))
const impactHt = computed(() => parsePriceValue(form.value.price || 0))
const totalHt = computed(() => baseHt.value + impactHt.value)
const totalTtc = computed(() => getPriceTtcWithImpact(baseHt.value, taxRate.value, impactHt.value))

function getOptionValueLabel(value) {
  if (!value) return ''
  const name = value?.name
  if (name && name.language) {
    const lang = Array.isArray(name.language) ? name.language[0] : name.language
    if (typeof lang === 'object') return String(lang['#text'] || lang._ || value.id || '')
    return String(lang || value.id || '')
  }
  if (typeof name === 'string') return name
  return String(value.id || '')
}

async function onSave() {
  try {
    error.value = ''
    loading.value = true

    if (!form.value.id_product) {
      throw new Error('ID produit requis')
    }
    if (!selectedOptionValueIds.value.length) {
      throw new Error('Au moins un ID de valeur d attribut est requis')
    }

    const data = {
      id_product: form.value.id_product,
      reference: form.value.reference || undefined,
      quantity: Number(form.value.quantity || 0),
      price: Number(form.value.price || 0),
      wholesale_price: Number(form.value.wholesale_price || 0),
      weight: Number(form.value.weight || 0),
      minimal_quantity: Number(form.value.minimal_quantity || 1),
      default_on: !!form.value.default_on,
      available_date: form.value.available_date || undefined,
      associations: {
        product_option_values: {
          product_option_value: selectedOptionValueIds.value.map(id => ({ id }))
        }
      }
    }

    await createCombination(data)
    router.push('/products')
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

async function loadOptions() {
  const [productsData, optionValuesData] = await Promise.all([
    getAllProducts({ filters: {} }),
    getAllProductOptionValues()
  ])

  products.value = productsData
  optionValues.value = Array.isArray(optionValuesData) ? optionValuesData : []
}

watch(() => form.value.id_product, async () => {
  const prod = selectedProduct.value
  if (!prod) {
    taxRate.value = 0
    return
  }
  taxRate.value = await getTaxRateForGroup(prod.id_tax_rules_group || '0')
})

onMounted(() => {
  loadOptions()
})
</script>

<template>
  <section class="create-form">
    <header class="header">
      <h1>Creer une declinaison</h1>
      <RouterLink to="/products" class="btn btn-secondary">Retour</RouterLink>
    </header>

    <p v-if="error" class="error-msg">{{ error }}</p>

    <form @submit.prevent="onSave">
      <div class="form-group">
        <label class="form-label">ID produit *</label>
        <select v-model="form.id_product" class="form-control" required>
          <option value="">Selectionner un produit</option>
          <option v-for="product in products" :key="product.id" :value="String(product.id)">
            {{ product.titre}}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Valeurs d attribut *</label>
        <select v-model="selectedOptionValueIds" class="form-control" multiple required>
          <option v-for="value in optionValues" :key="value.id || value['@id']" :value="String(value.id || value['@id'])">
            {{ getOptionValueLabel(value) }}
          </option>
        </select>
      </div>

      <div class="form-group">
        <label class="form-label">Reference</label>
        <input v-model="form.reference" type="text" class="form-control" />
      </div>

      <div class="form-group">
        <label class="form-label">Quantite</label>
        <input v-model="form.quantity" type="number" class="form-control" />
      </div>

      <div class="form-group">
        <label class="form-label">Impact prix HT</label>
        <input v-model="form.price" type="number" step="0.000001" class="form-control" />
      </div>

      <div class="form-group price-preview" v-if="form.id_product">
        <p>Prix de base HT: <strong>{{ baseHt.toFixed(6) }}</strong></p>
        <p>Impact HT: <strong>{{ impactHt.toFixed(6) }}</strong></p>
        <p>Total HT: <strong>{{ totalHt.toFixed(6) }}</strong></p>
        <p>Total TTC: <strong>{{ totalTtc.toFixed(6) }}</strong></p>
      </div>

      <div class="form-group">
        <label class="form-label">Prix achat (wholesale)</label>
        <input v-model="form.wholesale_price" type="number" step="0.000001" class="form-control" />
      </div>

      <div class="form-group">
        <label class="form-label">Poids</label>
        <input v-model="form.weight" type="number" step="0.000001" class="form-control" />
      </div>

      <div class="form-group">
        <label class="form-label">Quantite minimale</label>
        <input v-model="form.minimal_quantity" type="number" class="form-control" />
      </div>

      <div class="form-group">
        <label class="form-label">Date disponible</label>
        <input v-model="form.available_date" type="date" class="form-control" />
      </div>

      <div class="form-group checkbox-group">
        <input v-model="form.default_on" type="checkbox" id="default_on" />
        <label class="form-label" for="default_on">Definir par defaut</label>
      </div>

      <div class="actions">
        <button type="submit" class="btn btn-primary" :disabled="loading">
          {{ loading ? 'Creation...' : 'Creer' }}
        </button>
      </div>
    </form>
  </section>
</template>

<style scoped>
.create-form {
  padding: 16px;
  max-width: 600px;
  margin: 0 auto;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 500;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 10px;
}

.checkbox-group label {
  margin-bottom: 0;
}

.actions {
  margin-top: 24px;
  display: flex;
  justify-content: flex-end;
}

.price-preview {
  background: #f8f9fa;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  padding: 12px;
}

.error-msg {
  color: #dc3545;
  background: #f8d7da;
  padding: 10px;
  border-radius: 4px;
  margin-bottom: 15px;
}
</style>
