<template>
  <section class="stock-page">
    <header class="stock-header">
      <div class="header-left">
        <RouterLink to="/dashboard" class="back-link">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8l4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
          Retour
        </RouterLink>
        <div class="header-title-group">
          <h1 class="stock-title">Stock par produit</h1>
          <span class="stock-subtitle">Vue par déclinaison</span>
        </div>
      </div>
      <button class="refresh-btn" :disabled="loading" @click="load">
        <svg :class="['refresh-icon', { spinning: loading }]" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M13 2.5v4h-4M1 11.5v-4h4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M2.05 5.5A6 6 0 0 1 13 7M11.95 8.5A6 6 0 0 1 1 7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        {{ loading ? 'Chargement…' : 'Rafraîchir' }}
      </button>
    </header>

    <div v-if="error" class="error-banner">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="8" cy="8" r="7" stroke="currentColor" stroke-width="1.4"/>
        <path d="M8 5v3.5M8 11v.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
      </svg>
      {{ error }}
    </div>

    <div v-if="loading && rows.length === 0" class="skeleton-wrapper">
      <div class="skeleton-bar" v-for="n in 5" :key="n" :style="{ width: (55 + n * 8) + '%', animationDelay: (n * 0.07) + 's' }"></div>
    </div>

    <div v-else-if="!loading || rows.length > 0">
      <!-- KPI CARDS -->
      <div class="kpi-grid">
        <div class="kpi-card">
          <span class="kpi-label">Total physique</span>
          <span class="kpi-value">{{ totalPhysical.toLocaleString('fr-FR') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total réservé</span>
          <span class="kpi-value kpi-reserved">{{ totalReserved.toLocaleString('fr-FR') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Total disponible</span>
          <span class="kpi-value kpi-available">{{ totalAvailable.toLocaleString('fr-FR') }}</span>
        </div>
        <div class="kpi-card">
          <span class="kpi-label">Références</span>
          <span class="kpi-value">{{ rows.length }}</span>
        </div>
      </div>

      <!-- CATEGORIES TABLE -->
      <div class="table-section">
        <div class="table-section-header">
          <h2 class="section-title">Par catégorie</h2>
          <span class="section-count">{{ categoryRows.length }} catégorie{{ categoryRows.length > 1 ? 's' : '' }}</span>
        </div>
        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-main">Catégorie</th>
                <th class="col-num">Qté physique</th>
                <th class="col-num">Qté réservée</th>
                <th class="col-num">Qté disponible</th>
                <th class="col-bar">Disponibilité</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="categoryRows.length === 0">
                <td colspan="5" class="empty-cell">Aucune donnée.</td>
              </tr>
              <tr v-for="row in categoryRows" :key="row.key" class="data-row">
                <td class="cell-main">{{ row.categoryName }}</td>
                <td class="cell-num">{{ row.physical.toLocaleString('fr-FR') }}</td>
                <td class="cell-num">
                  <span v-if="row.reserved > 0" class="badge-reserved">{{ row.reserved.toLocaleString('fr-FR') }}</span>
                  <span v-else class="cell-zero">0</span>
                </td>
                <td class="cell-num">
                  <span :class="['badge-available', row.available <= 0 ? 'badge-zero' : '']">
                    {{ row.available.toLocaleString('fr-FR') }}
                  </span>
                </td>
                <td class="cell-bar">
                  <div class="avail-bar">
                    <div class="avail-bar-fill" :style="{ width: availPct(row) + '%' }"></div>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- PRODUCTS TABLE -->
      <div class="table-section">
        <div class="table-section-header">
          <h2 class="section-title">Par produit (déclinaison)</h2>
          <span class="section-count">{{ rows.length }} référence{{ rows.length > 1 ? 's' : '' }}</span>
        </div>

        <div class="search-bar-wrapper">
          <svg class="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
            <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.3"/>
            <path d="M9.5 9.5L13 13" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>
          </svg>
          <input
            v-model="search"
            type="text"
            class="search-input"
            placeholder="Filtrer par référence, nom, catégorie…"
          />
          <button v-if="search" class="clear-search" @click="search = ''">×</button>
        </div>

        <div class="table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th class="col-main">Produit (déclinaison)</th>
                <th>Catégorie</th>
                <th class="col-num">Qté physique</th>
                <th class="col-num">Qté réservée</th>
                <th class="col-num">Qté disponible</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="filteredRows.length === 0">
                <td colspan="5" class="empty-cell">Aucun résultat.</td>
              </tr>
              <tr v-for="row in filteredRows" :key="row.key" class="data-row">
                <td class="cell-main cell-label">{{ row.label }}</td>
                <td class="cell-category">{{ row.categoryName }}</td>
                <td class="cell-num">{{ row.physical.toLocaleString('fr-FR') }}</td>
                <td class="cell-num">
                  <span v-if="row.reserved > 0" class="badge-reserved">{{ row.reserved.toLocaleString('fr-FR') }}</span>
                  <span v-else class="cell-zero">0</span>
                </td>
                <td class="cell-num">
                  <span :class="['badge-available', row.available <= 0 ? 'badge-zero' : '']">
                    {{ row.available.toLocaleString('fr-FR') }}
                  </span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="filteredRows.length < rows.length" class="table-footer">
          {{ filteredRows.length }} / {{ rows.length }} résultats
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAllProducts } from '../../../service/productService.js'
import { getAllStocks as getAllPhysicalStocks } from '../../../service/stockService.js'
import { getAllStocks as getAllStockAvailables } from '../../../service/stockAvailableService.js'
import { getAllCombinations } from '../../../service/combinationService.js'
import { getAllCategories } from '../../../service/categorieService.js'

const loading = ref(false)
const error = ref('')
const search = ref('')

const products = ref([])
const categories = ref([])
const physicalStocks = ref([])
const stockAvailables = ref([])
const combinations = ref([])

function toInt(value) {
  const n = Number(value)
  return Number.isFinite(n) ? Math.trunc(n) : 0
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [prodList, catList, physList, avList] = await Promise.all([
      getAllProducts({ filters: {}, display: 'full' }),
      getAllCategories({ filters: {}, display: 'full' }),
      getAllPhysicalStocks({ filters: {}, display: 'full' }),
      getAllStockAvailables({ filters: {}, display: 'full' })
    ])

    products.value = Array.isArray(prodList) ? prodList : []
    categories.value = Array.isArray(catList) ? catList : []
    physicalStocks.value = Array.isArray(physList) ? physList : []
    stockAvailables.value = Array.isArray(avList) ? avList : []

    const hasAnyDeclination = (stockAvailables.value || []).some(
      s => String(s?.id_product_attribute || '0') !== '0'
    )
    if (hasAnyDeclination) {
      const combList = await getAllCombinations({ filters: {}, display: 'full' })
      combinations.value = Array.isArray(combList) ? combList : []
    } else {
      combinations.value = []
    }
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

const rows = computed(() => {
  const productById = new Map(
    (products.value || []).map(p => [String(p.id), p])
  )
  const categoryNameById = new Map(
    (categories.value || []).map(c => [String(c.id), String(c.name || c.id)])
  )
  const combById = new Map(
    (combinations.value || []).map(c => [String(c.id), c])
  )

  const productsWithDeclinations = new Set()
  for (const s of (stockAvailables.value || [])) {
    const productId = String(s?.id_product || '')
    if (!productId) continue
    if (String(s?.id_product_attribute || '0') !== '0') {
      productsWithDeclinations.add(productId)
    }
  }
  for (const c of (combinations.value || [])) {
    const productId = String(c?.id_product || '')
    if (productId) productsWithDeclinations.add(productId)
  }

  const availableByKey = new Map()
  for (const s of (stockAvailables.value || [])) {
    const productId = String(s?.id_product || '')
    if (!productId) continue
    const attrId = String(s?.id_product_attribute || '0') || '0'
    const key = `${productId}::${attrId}`
    availableByKey.set(key, (availableByKey.get(key) || 0) + toInt(s?.quantity))
  }

  const physicalByKey = new Map()
  for (const s of (physicalStocks.value || [])) {
    const productId = String(s?.id_product || '')
    if (!productId) continue
    const attrId = String(s?.id_product_attribute || '0') || '0'
    const key = `${productId}::${attrId}`
    physicalByKey.set(key, (physicalByKey.get(key) || 0) + toInt(s?.physical_quantity))
  }

  const keySet = new Set([...availableByKey.keys(), ...physicalByKey.keys()])
  const out = []

  for (const key of keySet) {
    const [productId, attrId] = key.split('::')
    if (String(attrId || '0') === '0' && productsWithDeclinations.has(String(productId))) continue

    const physical = physicalByKey.get(key) || 0
    const available = availableByKey.get(key) || 0
    const reserved = Math.max(0, physical - available)

    const product = productById.get(String(productId))
    const productRef = String(product?.reference || productId)
    const productName = String(product?.titre || '').trim()
    const categoryId = String(product?.categorieId || '').trim()
    const categoryName = categoryId ? (categoryNameById.get(categoryId) || categoryId) : '-'

    let label = productName ? `${productRef} — ${productName}` : productRef

    if (String(attrId || '0') !== '0') {
      const comb = combById.get(String(attrId))
      const combRef = String(comb?.reference || '').trim()
      label = combRef ? `${label} (${combRef})` : `${label} (décl. #${attrId})`
    }

    out.push({ key, productId, attrId, label, categoryName, physical, reserved, available })
  }

  out.sort((a, b) => String(a.label).localeCompare(String(b.label)))
  return out
})

const filteredRows = computed(() => {
  const q = search.value.trim().toLowerCase()
  if (!q) return rows.value
  return rows.value.filter(r =>
    r.label.toLowerCase().includes(q) || r.categoryName.toLowerCase().includes(q)
  )
})

const categoryRows = computed(() => {
  const grouped = new Map()
  for (const row of rows.value) {
    const key = String(row.categoryName || '-')
    const cur = grouped.get(key) || { physical: 0, reserved: 0, available: 0 }
    cur.physical += toInt(row.physical)
    cur.reserved += toInt(row.reserved)
    cur.available += toInt(row.available)
    grouped.set(key, cur)
  }
  return [...grouped.entries()]
    .map(([categoryName, t]) => ({ key: categoryName, categoryName, ...t }))
    .sort((a, b) => String(a.categoryName).localeCompare(String(b.categoryName)))
})

const totalPhysical = computed(() => rows.value.reduce((s, r) => s + r.physical, 0))
const totalReserved = computed(() => rows.value.reduce((s, r) => s + r.reserved, 0))
const totalAvailable = computed(() => rows.value.reduce((s, r) => s + r.available, 0))

function availPct(row) {
  if (!row.physical) return 0
  return Math.round(Math.max(0, Math.min(100, (row.available / row.physical) * 100)))
}

onMounted(load)
</script>

<style scoped>
/* ── BASE ────────────────────────────────────────────── */
.stock-page {
  padding: 28px 32px;
  max-width: 1100px;
  margin: 0 auto;
  font-family: 'DM Sans', 'Segoe UI', sans-serif;
  color: #1a1a1a;
}

/* ── HEADER ──────────────────────────────────────────── */
.stock-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 28px;
  gap: 16px;
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  color: #6b7280;
  text-decoration: none;
  letter-spacing: 0.01em;
  transition: color 0.15s;
}
.back-link:hover { color: #111827; }

.header-title-group { display: flex; align-items: baseline; gap: 10px; }

.stock-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: #0f172a;
}

.stock-subtitle {
  font-size: 13px;
  color: #94a3b8;
  font-weight: 400;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  font-size: 13px;
  font-weight: 500;
  color: #374151;
  background: #fff;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
  letter-spacing: 0.01em;
  white-space: nowrap;
}
.refresh-btn:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
  color: #0f172a;
}
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

.refresh-icon { transition: transform 0.3s; }
.spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── ERROR ───────────────────────────────────────────── */
.error-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #b91c1c;
  font-size: 14px;
  margin-bottom: 24px;
}

/* ── SKELETON ────────────────────────────────────────── */
.skeleton-wrapper { display: flex; flex-direction: column; gap: 10px; margin-top: 12px; }
.skeleton-bar {
  height: 36px;
  background: linear-gradient(90deg, #f1f5f9 25%, #e2e8f0 50%, #f1f5f9 75%);
  background-size: 200% 100%;
  border-radius: 6px;
  animation: shimmer 1.4s infinite;
}
@keyframes shimmer { to { background-position: -200% 0; } }

/* ── KPI CARDS ───────────────────────────────────────── */
.kpi-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 12px;
  margin-bottom: 32px;
}

.kpi-card {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 16px 18px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.kpi-label {
  font-size: 12px;
  font-weight: 500;
  color: #94a3b8;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.kpi-value {
  font-size: 26px;
  font-weight: 700;
  color: #0f172a;
  letter-spacing: -0.5px;
  line-height: 1.1;
}
.kpi-reserved { color: #b45309; }
.kpi-available { color: #0d7a5f; }

/* ── SECTIONS ────────────────────────────────────────── */
.table-section { margin-bottom: 36px; }

.table-section-header {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin-bottom: 12px;
}

.section-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: #1e293b;
  letter-spacing: -0.2px;
}

.section-count {
  font-size: 12px;
  color: #94a3b8;
  font-weight: 400;
}

/* ── SEARCH ──────────────────────────────────────────── */
.search-bar-wrapper {
  position: relative;
  margin-bottom: 10px;
  max-width: 400px;
}

.search-icon {
  position: absolute;
  left: 11px;
  top: 50%;
  transform: translateY(-50%);
  color: #94a3b8;
  pointer-events: none;
}

.search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 8px 32px 8px 32px;
  font-size: 13px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  background: #fff;
  color: #1e293b;
  outline: none;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.search-input:focus {
  border-color: #94a3b8;
  box-shadow: 0 0 0 3px rgba(148, 163, 184, 0.12);
}
.search-input::placeholder { color: #cbd5e1; }

.clear-search {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  cursor: pointer;
  color: #94a3b8;
  font-size: 16px;
  line-height: 1;
  padding: 2px 4px;
  transition: color 0.15s;
}
.clear-search:hover { color: #374151; }

/* ── TABLE ───────────────────────────────────────────── */
.table-wrapper {
  overflow-x: auto;
  border: 1px solid #e2e8f0;
  border-radius: 10px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
  min-width: 520px;
}

.data-table thead tr {
  background: #f8fafc;
  border-bottom: 1px solid #e2e8f0;
}

.data-table th {
  padding: 10px 14px;
  text-align: left;
  font-size: 11.5px;
  font-weight: 600;
  color: #64748b;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  white-space: nowrap;
}

.col-num { text-align: right !important; }
.col-bar { width: 120px; }
.col-main { min-width: 200px; }

.data-row {
  border-bottom: 1px solid #f1f5f9;
  transition: background 0.1s;
}
.data-row:last-child { border-bottom: none; }
.data-row:hover { background: #fafbfc; }

.data-table td {
  padding: 10px 14px;
  vertical-align: middle;
}

.cell-main { font-weight: 500; color: #1e293b; }
.cell-label { font-size: 13px; }
.cell-category {
  font-size: 12.5px;
  color: #64748b;
}
.cell-num { text-align: right; font-variant-numeric: tabular-nums; }
.cell-zero { color: #cbd5e1; font-size: 13px; }
.empty-cell {
  text-align: center;
  padding: 24px;
  color: #94a3b8;
  font-style: italic;
}

/* ── BADGES ──────────────────────────────────────────── */
.badge-reserved {
  display: inline-block;
  padding: 2px 8px;
  background: #fef3c7;
  color: #92400e;
  font-size: 12px;
  font-weight: 600;
  border-radius: 5px;
}

.badge-available {
  display: inline-block;
  padding: 2px 8px;
  background: #d1fae5;
  color: #065f46;
  font-size: 12px;
  font-weight: 600;
  border-radius: 5px;
}
.badge-zero {
  background: #f1f5f9;
  color: #94a3b8;
}

/* ── AVAILABILITY BAR ────────────────────────────────── */
.cell-bar { padding: 10px 14px; }
.avail-bar {
  height: 5px;
  background: #e2e8f0;
  border-radius: 99px;
  overflow: hidden;
  min-width: 80px;
}
.avail-bar-fill {
  height: 100%;
  background: #10b981;
  border-radius: 99px;
  transition: width 0.4s ease;
}

/* ── FOOTER ──────────────────────────────────────────── */
.table-footer {
  padding: 8px 14px;
  font-size: 12px;
  color: #94a3b8;
  text-align: right;
  border-top: 1px solid #f1f5f9;
}
</style>