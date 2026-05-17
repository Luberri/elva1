<template>
  <section class="detail-section">
    <header class="header">
      <h1>{{ product?.titre || 'Produit' }}</h1>
      <RouterLink to="/fo/products" class="btn btn-secondary">Retour</RouterLink>
    </header>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="loading">Chargement...</p>

    <div v-if="!loading && product" class="card">
      <div class="image" v-if="product.image">
        <img :src="product.image" :alt="product.titre" />
      </div>
      <div class="body">
        <p class="ref">Ref: {{ product.reference || '-' }}</p>
        <p class="price">Prix TTC: {{ priceTtc }}</p>
        <div class="purchase">
          <label class="form-label">Declinaison</label>
          <select v-model="selectedCombinationId" :disabled="combinations.length === 0">
            <option value="">Produit simple</option>
            <option v-for="c in combinations" :key="c.id" :value="c.id">
              {{ c.reference || ('Combinaison #' + c.id) }}
            </option>
          </select>

          <label class="form-label">Quantite</label>
          <input v-model.number="quantity" type="number" min="1" />

          <button class="btn btn-primary" :disabled="adding" @click="handleAddToCart">
            {{ adding ? 'Ajout...' : 'Ajouter au panier' }}
          </button>
        </div>
        <p v-if="addMessage" class="success-msg">{{ addMessage }}</p>
        <div v-if="product.description" class="desc" v-html="product.description"></div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { getProductDetail, getPriceTtcWithImpact, parsePriceValue } from '../../service/productService.js'
import { getTaxRateForGroup } from '../../service/taxeService.js'
import { getCombinationsByProduct } from '../../service/combinationService.js'
import { addToCart } from '../../service/cartService.js'
import { DEFAULT_CURRENCY_NAME } from '../../api/util.js'

const route = useRoute()
const loading = ref(false)
const error = ref('')
const product = ref(null)
const taxRate = ref(0)
const combinations = ref([])
const selectedCombinationId = ref('')
const quantity = ref(1)
const adding = ref(false)
const addMessage = ref('')

const priceTtc = computed(() => {
  if (!product.value) return '-'
  const basePrice = parsePriceValue(product.value.price)
  const selected = combinations.value.find(
    (c) => String(c.id) === String(selectedCombinationId.value)
  )
  const impact = selected ? parsePriceValue(selected.price) : 0
  const ttc = getPriceTtcWithImpact(basePrice, taxRate.value, impact)
  return `${ttc.toFixed(2)} ${DEFAULT_CURRENCY_NAME}`
})

async function loadProduct() {
  const id = route.params.id
  if (!id) return

  error.value = ''
  loading.value = true
  try {
    const data = await getProductDetail(id)
    product.value = data
    const rate = await getTaxRateForGroup(data?.id_tax_rules_group)
    taxRate.value = rate || 0
    combinations.value = await getCombinationsByProduct(id)
    const defaultComb = combinations.value.find(c => c.default_on)
    selectedCombinationId.value = defaultComb?.id || ''
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

async function handleAddToCart() {
  if (!product.value) return

  adding.value = true
  addMessage.value = ''
  error.value = ''
  try {
    const customer = JSON.parse(localStorage.getItem('customer') || 'null')
    const idCustomer = customer?.id

    await addToCart({
      id_customer: idCustomer,
      id_product: product.value.id,
      id_product_attribute: selectedCombinationId.value || 0,
      quantity: quantity.value || 1
    })
    addMessage.value = 'Produit ajoute au panier.'
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    adding.value = false
  }
}

onMounted(() => {
  loadProduct()
})
</script>

<style scoped>
.detail-section {
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
  overflow: hidden;
}

.image {
  background: #f3f3f3;
  height: 320px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.body {
  padding: 16px;
}

.ref {
  color: #777;
  margin: 4px 0;
}

.price {
  font-weight: 600;
  margin: 10px 0;
}

.purchase {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  margin: 16px 0;
  max-width: 320px;
}

.purchase label {
  font-weight: 600;
  color: #555;
}

.purchase select,
.purchase input {
  padding: 8px 10px;
  border: 1px solid #ddd;
  border-radius: 4px;
}

.btn-primary {
  background: #3f51b5;
  color: #fff;
}

.btn-primary:hover:not(:disabled) {
  background: #3646a3;
}

.success-msg {
  color: #0f5132;
  background: #d1e7dd;
  padding: 8px;
  border-radius: 4px;
  margin-top: 8px;
}

.desc {
  margin-top: 12px;
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

.error-msg {
  color: #d32f2f;
  background-color: #ffebee;
  padding: 10px;
  border-radius: 4px;
}
</style>
