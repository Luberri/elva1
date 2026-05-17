<template>
  <section class="list-section">
    <header class="header">
      <h1>Produits</h1>
      <div class="actions">
        <RouterLink to="/fo/address" class="btn btn-secondary">Adresse</RouterLink>
        <RouterLink to="/fo/cart" class="btn btn-secondary">Mon panier</RouterLink>
        <RouterLink to="/fo/orders" class="btn btn-secondary">Mes commandes</RouterLink>
        <button class="btn btn-secondary" @click="handleLogout">
          Deconnexion
        </button>
        <button class="btn btn-secondary" :disabled="loading" @click="loadProducts">
          {{ loading ? 'Chargement...' : 'Recharger' }}
        </button>
      </div>
    </header>
    <div class="container filtre">
      <form class="row row-cols-lg-auto g-3 align-items-center" @submit.prevent="loadProducts">
        <!-- Filtre par nom -->
        <div class="col-12">
          <input class="form-control" type="text" placeholder="Filtrer par nom..." v-model="filterName" />
        </div>
        <!-- Filtre par catégorie -->
        <div class="col-12">
          <select class="form-select" v-model="filterCategory">
            <option value="">Toutes les catégories</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">
              {{ cat.name }}
            </option>
          </select>
        </div>

        <!-- Prix min -->
        <div class="col-12">
          <input class="form-control" type="number" placeholder="Prix min" v-model="filterMin" />
        </div>
        <div class="col-12">-</div>
        <!-- Prix max -->
        <div class="col-12">
          <input class="form-control" type="number" placeholder="Prix max" v-model="filterMax" />
        </div>

        <!-- Bouton de soumission -->
        <div class="col-12">
          <button type="submit" class="btn btn-primary w-100">Filtrer</button>
        </div>
      </form>

      <!-- </div> -->
    </div>

    <p v-if="error" class="error-msg">{{ error }}</p>
    <p v-if="loading">Chargement...</p>

    <div class="grid" v-if="products.length">
      <RouterLink
        v-for="p in products"
        :key="p.id"
        :to="{ name: 'fo-product-detail', params: { id: p.id } }"
        class="card"
      >
        <span v-if="getBadge(p)" class="badge" :class="getBadge(p).className">
          {{ getBadge(p).label }}
        </span>
        <div class="image" v-if="p.image">
          <img :src="p.image" :alt="p.titre" />
        </div>
        <div class="body">
          <h3>{{ p.titre || 'Produit' }}</h3>
          <p class="ref">Ref: {{ p.reference || '-' }}</p>
          <p class="price">Prix: {{ getPriceWithTax(p) }}</p>
        </div>
      </RouterLink>
    </div>
    <p v-else>Aucun produit disponible.</p>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { getAllProducts } from '../../service/productService.js'
import { getTaxRateForGroup } from '../../service/taxeService.js'
import { DEFAULT_CURRENCY_NAME } from '../../api/util.js'
import { getAllCategories } from '../../service/categorieService.js'

const loading = ref(false)
const error = ref('')
const products = ref([])
const categories = ref([])
const taxRateMap = ref(new Map())
const router = useRouter()

const filterName = ref('')
const filterCategory = ref('')
const filterMin = ref('')
const filterMax = ref('')

function parseAvailableDate(value) {
  const raw = String(value || '').trim()
  if (!raw) return null
  const dateOnly = raw.split(' ')[0]
  const match = dateOnly.match(/^\d{4}-\d{2}-\d{2}$/)
  if (!match) return null
  const [year, month, day] = dateOnly.split('-').map(part => Number(part))
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function getBadge(product) {
  const availableDate = parseAvailableDate(product.available_date)
  if (!availableDate) return null

  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffMs = startOfToday - availableDate
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays >= 0 && diffDays <= 1) {
    return { label: 'HOT', className: 'badge-hot' }
  }
  if (diffDays >= 0 && diffDays <= 7) {
    return { label: 'NEW', className: 'badge-new' }
  }
  return null
}

function parsePrice(value) {
  const num = parseFloat(String(value).replace(',', '.'))
  return Number.isFinite(num) ? num : 0
}

function formatPrice(value) {
  return `${value.toFixed(2)} ${DEFAULT_CURRENCY_NAME}`
}

function getPriceWithTax(product) {
  const basePrice = parsePrice(product.price)
  const rate = taxRateMap.value.get(String(product.id_tax_rules_group)) || 0
  const ttc = basePrice * (1 + rate / 100)
  return formatPrice(ttc)
}

function handleLogout() {
  localStorage.removeItem('customer')
  localStorage.removeItem('fo_cart_id')
  router.push('/fo/login')
}

async function loadProducts() {
  error.value = ''
  loading.value = true
  try {
    const filters = {}
    if (filterName.value) {
      filters.name = `%[${filterName.value}]%`
    }
    if (filterCategory.value) {
      filters.id_category_default = `[${filterCategory.value}]`
    }
    const priceFilters = []
    if (filterMin.value) {
      priceFilters.push(`[${filterMin.value}`)
    } else {
      priceFilters.push(`[0`)
    }
    if (filterMax.value) {
      priceFilters.push(`${filterMax.value}]`)
    } else {
      priceFilters.push(`10000000000000000]`)
    }
    if (priceFilters.length) {
      filters.price = priceFilters
    }
    const list = await getAllProducts({ filters })
    products.value = list
    const cats = await getAllCategories({ filters: {} })
    categories.value = cats
    const groupIds = [...new Set(
      list.map(p => String(p.id_tax_rules_group || '0'))
    )]

    const entries = await Promise.all(
      groupIds.map(async (id) => {
        const rate = await getTaxRateForGroup(id)
        return [id, rate]
      })
    )
    taxRateMap.value = new Map(entries)
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadProducts()
})
const categoriesList = computed(() => categories.value)
</script>

<style scoped>
.list-section {
  padding: 16px;
}

.header {
  display: flex;
  justify-content: space-between;
  margin-bottom: 20px;
}

.actions {
  display: flex;
  gap: 10px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
}

.card {
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  text-decoration: none;
  position: relative;
}

.badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: #fff;
}

.badge-hot { background: #e74c3c; }
.badge-new { background: #01b887; }

.image {
  background: #f3f3f3;
  height: 160px;
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
  padding: 12px;
}

.ref {
  color: #777;
  margin: 4px 0;
}

.price {
  font-weight: 600;
}
.filtre {
  margin-bottom: 20px;
}
</style>
