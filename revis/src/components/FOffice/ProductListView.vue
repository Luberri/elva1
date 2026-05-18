<template>
  <section class="products-page">

    <!-- Navigation bar -->
    <nav class="topbar">
      <div class="topbar-brand">
        <span class="brand-dot" />
        <span class="brand-name">Boutique</span>
      </div>
      <div class="topbar-links">
        <RouterLink to="/fo/address" class="nav-link">Adresse</RouterLink>
        <RouterLink to="/fo/cart" class="nav-link">
          <svg width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
          Mon panier
        </RouterLink>
        <RouterLink to="/fo/orders" class="nav-link">Mes commandes</RouterLink>
        <button class="nav-link nav-logout" @click="handleLogout">Déconnexion</button>
      </div>
    </nav>

    <!-- Page title -->
    <div class="page-header">
      <h1 class="page-title">Produits</h1>
      <button class="reload-btn" :disabled="loading" @click="loadProducts">
        <svg :class="{ spinning: loading }" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        {{ loading ? 'Chargement…' : 'Recharger' }}
      </button>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input
        class="filter-input"
        type="text"
        placeholder="Rechercher un produit…"
        v-model="filterName"
        @keyup.enter="loadProducts"
      />
      <select class="filter-select" v-model="filterCategory" @change="loadProducts">
        <option value="">Toutes les catégories</option>
        <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
      </select>
      <div class="price-range">
        <input class="filter-input price-input" type="number" placeholder="Min" v-model="filterMin" />
        <span class="range-sep">–</span>
        <input class="filter-input price-input" type="number" placeholder="Max" v-model="filterMax" />
      </div>
      <button class="filter-btn" @click="loadProducts">Filtrer</button>
    </div>

    <!-- States -->
    <p v-if="error" class="state-msg error-msg">{{ error }}</p>

    <!-- Grid -->
    <div class="grid" v-if="!loading && products.length">
      <RouterLink
        v-for="p in products"
        :key="p.id"
        :to="{ name: 'fo-product-detail', params: { id: p.id } }"
        class="card"
      >
        <span v-if="getBadge(p)" class="badge" :class="getBadge(p).className">
          {{ getBadge(p).label }}
        </span>
        <div class="card-image">
          <img v-if="p.image" :src="p.image" :alt="p.titre" />
          <div v-else class="card-image-placeholder">
            <svg width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.5" viewBox="0 0 24 24" opacity=".3">
              <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/>
            </svg>
          </div>
        </div>
        <div class="card-body">
          <p class="card-ref">{{ p.reference || '—' }}</p>
          <h3 class="card-title">{{ p.titre || 'Produit' }}</h3>
          <p class="card-price">{{ getPriceWithTax(p) }}</p>
        </div>
      </RouterLink>
    </div>

    <!-- Skeleton loader -->
    <div class="grid" v-else-if="loading">
      <div v-for="i in 8" :key="i" class="card skeleton">
        <div class="card-image skeleton-img" />
        <div class="card-body">
          <div class="skel-line short" />
          <div class="skel-line" />
          <div class="skel-line medium" />
        </div>
      </div>
    </div>

    <p v-else class="state-msg">Aucun produit disponible.</p>
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
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOnly)) return null
  const [year, month, day] = dateOnly.split('-').map(Number)
  if (!year || !month || !day) return null
  return new Date(year, month - 1, day)
}

function getBadge(product) {
  const availableDate = parseAvailableDate(product.date_availability_produit || product.available_date)
  if (!availableDate) return null
  const today = new Date()
  const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  const diffDays = Math.floor((startOfToday - availableDate) / 86400000)
  if (diffDays >= 0 && diffDays <= 1) return { label: 'HOT', className: 'badge-hot' }
  if (diffDays >= 0 && diffDays <= 7) return { label: 'NEW', className: 'badge-new' }
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
  return formatPrice(basePrice * (1 + rate / 100))
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
    if (filterName.value) filters.name = `%[${filterName.value}]%`
    if (filterCategory.value) filters.id_category_default = `[${filterCategory.value}]`

    const min = filterMin.value || '0'
    const max = filterMax.value || '10000000000000000'
    filters.price = [`[${min}`, `${max}]`]

    const [list, cats] = await Promise.all([
      getAllProducts({ filters }),
      getAllCategories({ filters: {} }),
    ])
    products.value = list
    categories.value = cats

    const groupIds = [...new Set(list.map(p => String(p.id_tax_rules_group || '0')))]
    const entries = await Promise.all(groupIds.map(async id => [id, await getTaxRateForGroup(id)]))
    taxRateMap.value = new Map(entries)
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(loadProducts)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

/* ── Reset & base ── */
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.products-page {
  font-family: 'DM Sans', sans-serif;
  background: #f6f6f4;
  min-height: 100vh;
  color: #1a1a1a;
}

/* ── Top bar ── */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 32px;
  height: 56px;
  background: #fff;
  border-bottom: 1px solid #e8e8e4;
  position: sticky;
  top: 0;
  z-index: 100;
}

.topbar-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -0.01em;
}

.brand-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #1a1a1a;
  display: inline-block;
}

.topbar-links {
  display: flex;
  align-items: center;
  gap: 4px;
}

.nav-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 13.5px;
  font-weight: 500;
  color: #555;
  text-decoration: none;
  background: none;
  border: none;
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}

.nav-link:hover,
.nav-link.router-link-active {
  background: #f0f0ec;
  color: #1a1a1a;
}

.nav-logout {
  color: #c0392b;
}
.nav-logout:hover {
  background: #fdf0ef;
  color: #c0392b;
}

/* ── Page header ── */
.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32px 32px 20px;
}

.page-title {
  font-size: 26px;
  font-weight: 600;
  letter-spacing: -0.03em;
}

.reload-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 7px 14px;
  border-radius: 8px;
  border: 1px solid #e0e0db;
  background: #fff;
  font-family: inherit;
  font-size: 13px;
  font-weight: 500;
  color: #555;
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s;
}

.reload-btn:hover:not(:disabled) {
  border-color: #bbb;
  color: #1a1a1a;
}

.reload-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.spinning {
  animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Filters ── */
.filters {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 32px 28px;
  flex-wrap: wrap;
}

.filter-input,
.filter-select {
  height: 38px;
  padding: 0 12px;
  border: 1px solid #e0e0db;
  border-radius: 8px;
  background: #fff;
  font-family: inherit;
  font-size: 13.5px;
  color: #1a1a1a;
  outline: none;
  transition: border-color 0.15s;
}

.filter-input:focus,
.filter-select:focus {
  border-color: #1a1a1a;
}

.filter-input { width: 220px; }
.filter-select { width: 180px; }

.price-range {
  display: flex;
  align-items: center;
  gap: 6px;
}
.price-input { width: 90px; }
.range-sep { color: #999; font-size: 13px; }

.filter-btn {
  height: 38px;
  padding: 0 18px;
  border-radius: 8px;
  border: none;
  background: #1a1a1a;
  color: #fff;
  font-family: inherit;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.15s;
}
.filter-btn:hover { opacity: 0.82; }

/* ── States ── */
.state-msg {
  padding: 0 32px 32px;
  font-size: 14px;
  color: #888;
}
.error-msg { color: #c0392b; }

/* ── Grid ── */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 14px;
  padding: 0 32px 48px;
}

/* ── Card ── */
.card {
  background: #fff;
  border-radius: 12px;
  border: 1px solid #ebebe7;
  overflow: hidden;
  text-decoration: none;
  color: inherit;
  position: relative;
  transition: box-shadow 0.2s, transform 0.2s;
}

.card:hover {
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

/* ── Badge ── */
.badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #fff;
  z-index: 1;
}
.badge-hot { background: #e74c3c; }
.badge-new { background: #01b887; }

/* ── Card image ── */
.card-image {
  background: #f6f6f4;
  height: 154px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-image img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.card-image-placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
}

/* ── Card body ── */
.card-body {
  padding: 12px 14px 14px;
}

.card-ref {
  font-family: 'DM Mono', monospace;
  font-size: 10.5px;
  color: #aaa;
  margin-bottom: 4px;
  letter-spacing: 0.02em;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  line-height: 1.35;
  margin-bottom: 8px;
  color: #1a1a1a;
  letter-spacing: -0.01em;
}

.card-price {
  font-size: 14px;
  font-weight: 600;
  color: #1a1a1a;
}

/* ── Skeleton ── */
.skeleton { pointer-events: none; }

.skeleton-img {
  animation: pulse 1.4s ease-in-out infinite;
}

.skel-line {
  height: 11px;
  border-radius: 6px;
  background: #ebebe7;
  margin-bottom: 8px;
  animation: pulse 1.4s ease-in-out infinite;
}
.skel-line.short { width: 40%; }
.skel-line.medium { width: 55%; }

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.45; }
}

/* ── Responsive ── */
@media (max-width: 600px) {
  .topbar { padding: 0 16px; }
  .topbar-links { gap: 0; }
  .nav-link { padding: 6px 8px; font-size: 13px; }
  .page-header { padding: 20px 16px 14px; }
  .filters { padding: 0 16px 20px; }
  .filter-input { width: 100%; }
  .filter-select { width: 100%; }
  .grid { padding: 0 16px 32px; gap: 10px; }
}
</style>