<template>
  <section class="stock-page">

    <!-- Header -->
    <div class="page-header">
      <div>
        <h1 class="page-title">Mouvements de stock</h1>
        <p class="page-sub">Suivi des entrées et sorties par période et produit</p>
      </div>
      <button class="reload-btn" :disabled="loading" @click="load">
        <svg :class="{ spinning: loading }" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
        </svg>
        {{ loading ? 'Chargement…' : 'Rafraîchir' }}
      </button>
    </div>

    <!-- Filters -->
    <div class="filters">
      <input class="filter-input wide" v-model="qProduct" placeholder="ID produit ou référence…" />
      <select class="filter-select" v-model="selectedProductId">
        <option value="">Tous les produits</option>
        <option v-for="p in productOptions" :key="p.id" :value="p.id">
          {{ p.label }} (#{{ p.id }})
        </option>
      </select>
      <div class="date-range">
        <input class="filter-input date-input" v-model="startDate" type="date" />
        <span class="range-sep">–</span>
        <input class="filter-input date-input" v-model="endDate" type="date" />
      </div>
      <button class="filter-btn" @click="load">Filtrer</button>
    </div>

    <!-- Error -->
    <p v-if="error" class="state-msg error-msg">{{ error }}</p>

    <!-- KPI strip -->
    <div class="kpi-strip" v-if="!loading">
      <div class="kpi kpi-in">
        <span class="kpi-label">Entrant</span>
        <span class="kpi-value">+{{ totalIn }}</span>
      </div>
      <div class="kpi kpi-out">
        <span class="kpi-label">Sortant</span>
        <span class="kpi-value">-{{ totalOut }}</span>
      </div>
      <div class="kpi kpi-net">
        <span class="kpi-label">Net</span>
        <span class="kpi-value">{{ totalQty >= 0 ? '+' : '' }}{{ totalQty }}</span>
      </div>
      <div class="kpi kpi-count">
        <span class="kpi-label">Lignes</span>
        <span class="kpi-value">{{ filtered.length }}</span>
      </div>
    </div>

    <!-- Main table -->
    <div class="table-wrap" v-if="!loading">
      <table class="data-table">
        <thead>
          <tr>
            <th>Date</th>
            <th>Produit</th>
            <th>Réf</th>
            <th>Attr</th>
            <th>Qté</th>
            <th>Prix TE</th>
            <th>Entrepôt</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="filtered.length === 0">
            <td colspan="7" class="empty-row">Aucun mouvement pour ces critères.</td>
          </tr>
          <tr v-for="m in filtered" :key="m.id">
            <td class="mono">{{ formatDate(m.date_add) }}</td>
            <td>
              <span class="product-name">{{ getProductLabel(m.id_product) }}</span>
              <span class="product-id">#{{ m.id_product }}</span>
            </td>
            <td class="mono">{{ m.reference || '—' }}</td>
            <td class="mono dim">{{ m.id_product_attribute || '—' }}</td>
            <td>
              <span class="pill" :class="m.sign > 0 ? 'pill-in' : 'pill-out'">
                {{ m.sign > 0 ? '+' : '-' }}{{ Math.abs(Number(m.physical_quantity || 0)) }}
              </span>
            </td>
            <td class="mono">{{ m.price_te }}</td>
            <td class="mono dim">{{ m.id_warehouse || '—' }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Skeleton -->
    <div class="table-wrap skeleton-wrap" v-else>
      <div v-for="i in 6" :key="i" class="skel-row">
        <div class="skel-line" style="width:80px" />
        <div class="skel-line" style="width:140px" />
        <div class="skel-line" style="width:60px" />
        <div class="skel-line" style="width:36px" />
        <div class="skel-line" style="width:44px" />
        <div class="skel-line" style="width:55px" />
        <div class="skel-line" style="width:40px" />
      </div>
    </div>

    <!-- Per-product summary -->
    <div class="summary-block" v-if="!loading && perItemTotals.length">
      <div class="summary-header">
        <h2 class="summary-title">Totaux par produit / déclinaison</h2>
        <span class="summary-badge">{{ perItemTotals.length }} ligne{{ perItemTotals.length > 1 ? 's' : '' }}</span>
      </div>
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>Produit</th>
              <th>Attr</th>
              <th>Entrant</th>
              <th>Sortant</th>
              <th>Net</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="item in perItemTotals" :key="`${item.productId}-${item.attrId}`">
              <td>
                <span class="product-name">{{ item.name }}</span>
                <span class="product-id">#{{ item.productId }}</span>
              </td>
              <td class="mono dim">{{ item.attrId }}</td>
              <td><span class="pill pill-in">+{{ item.totalIn }}</span></td>
              <td><span class="pill pill-out">-{{ item.totalOut }}</span></td>
              <td><span class="pill pill-net">{{ item.total >= 0 ? '+' : '' }}{{ item.total }}</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

  </section>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { getAllStockMvts } from '../../../service/stockMvtService.js'
import { getAllProducts } from '../../../service/productService.js'

const loading = ref(false)
const error = ref('')
const movements = ref([])
const productMap = ref(new Map())
const selectedProductId = ref('')
const startDate = ref('')
const endDate = ref('')
const qProduct = ref('')

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [list, products] = await Promise.all([
      getAllStockMvts({}),
      getAllProducts({ filters: {} })
    ])
    movements.value = list
    productMap.value = new Map(products.map(p => [String(p.id), p]))
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

function getProductLabel(id) {
  const p = productMap.value.get(String(id))
  return p ? (p.titre || '').trim() || String(id) : String(id || '')
}

function formatDate(value) {
  if (!value) return '—'
  return String(value).split(' ')[0]
}

const filtered = computed(() => {
  const s = startDate.value
  const e = endDate.value
  const qp = String(qProduct.value || '').trim()
  const sp = String(selectedProductId.value || '').trim()

  return movements.value.filter(m => {
    const d = String(m.date_add || '').split(' ')[0]
    if (s && d < s) return false
    if (e && d > e) return false
    if (sp && String(m.id_product || '') !== sp) return false
    if (qp && String(m.id_product || '') !== qp && !String(m.reference || '').includes(qp)) return false
    return true
  })
})

const productOptions = computed(() =>
  Array.from(productMap.value.values())
    .map(p => ({ id: String(p.id), label: p.titre || String(p.id) }))
    .sort((a, b) => a.label.localeCompare(b.label))
)

const totalIn = computed(() =>
  filtered.value.reduce((s, m) => m.sign > 0 ? s + Math.abs(Number(m.physical_quantity || 0)) : s, 0)
)
const totalOut = computed(() =>
  filtered.value.reduce((s, m) => m.sign < 0 ? s + Math.abs(Number(m.physical_quantity || 0)) : s, 0)
)
const totalQty = computed(() => totalIn.value - totalOut.value)

const perItemTotals = computed(() => {
  const map = new Map()
  for (const m of filtered.value) {
    const productId = String(m.id_product || '')
    const attrId = String(m.id_product_attribute || '0')
    const key = `${productId}::${attrId}`
    const qty = Math.abs(Number(m.physical_quantity || 0))
    const cur = map.get(key) || { productId, attrId, name: getProductLabel(productId), totalIn: 0, totalOut: 0, total: 0 }
    if (m.sign > 0) cur.totalIn += qty
    if (m.sign < 0) cur.totalOut += qty
    cur.total = cur.totalIn - cur.totalOut
    map.set(key, cur)
  }
  return Array.from(map.values()).sort((a, b) => {
    const pa = Number(a.productId), pb = Number(b.productId)
    if (Number.isFinite(pa) && Number.isFinite(pb) && pa !== pb) return pa - pb
    if (a.productId !== b.productId) return a.productId.localeCompare(b.productId)
    return Number(a.attrId) - Number(b.attrId)
  })
})

onMounted(load)
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

.stock-page {
  font-family: 'DM Sans', sans-serif;
  background: #f6f6f4;
  min-height: 100vh;
  padding: 28px 32px 48px;
  color: #1a1a1a;
}

/* ── Header ── */
.page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 22px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  letter-spacing: -0.03em;
  line-height: 1.2;
}

.page-sub {
  font-size: 13.5px;
  color: #888;
  margin-top: 4px;
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
  white-space: nowrap;
  transition: border-color 0.15s, color 0.15s;
}
.reload-btn:hover:not(:disabled) { border-color: #bbb; color: #1a1a1a; }
.reload-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.spinning { animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* ── Filters ── */
.filters {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
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
.filter-input:focus, .filter-select:focus { border-color: #1a1a1a; }

.filter-input.wide { width: 220px; }
.filter-select { width: 210px; }
.date-input { width: 138px; }

.date-range {
  display: flex;
  align-items: center;
  gap: 6px;
}
.range-sep { color: #aaa; font-size: 13px; }

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
.state-msg { font-size: 14px; color: #888; margin-bottom: 16px; }
.error-msg { color: #c0392b; }

/* ── KPI strip ── */
.kpi-strip {
  display: flex;
  gap: 10px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.kpi {
  flex: 1;
  min-width: 110px;
  background: #fff;
  border: 1px solid #e8e8e4;
  border-radius: 10px;
  padding: 12px 16px;
}

.kpi-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: #999;
  margin-bottom: 6px;
}

.kpi-value {
  display: block;
  font-size: 22px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.kpi-in  .kpi-value { color: #16a34a; }
.kpi-out .kpi-value { color: #dc2626; }
.kpi-net .kpi-value { color: #1a1a1a; }
.kpi-count .kpi-value { color: #1a1a1a; }

/* ── Tables ── */
.table-wrap {
  background: #fff;
  border: 1px solid #e8e8e4;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 20px;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13.5px;
}

.data-table thead th {
  background: #f9f9f7;
  border-bottom: 1px solid #e8e8e4;
  padding: 10px 14px;
  font-weight: 600;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: #888;
  text-align: left;
  white-space: nowrap;
}

.data-table tbody tr {
  border-bottom: 1px solid #f0f0ec;
  transition: background 0.1s;
}
.data-table tbody tr:last-child { border-bottom: none; }
.data-table tbody tr:hover { background: #fafaf8; }

.data-table td {
  padding: 10px 14px;
  vertical-align: middle;
}

.mono {
  font-family: 'DM Mono', monospace;
  font-size: 12.5px;
}
.dim { color: #aaa; }

.product-name {
  display: block;
  font-weight: 500;
  color: #1a1a1a;
  line-height: 1.2;
}

.product-id {
  display: block;
  font-family: 'DM Mono', monospace;
  font-size: 11px;
  color: #bbb;
  margin-top: 1px;
}

.empty-row {
  text-align: center;
  color: #bbb;
  padding: 28px !important;
  font-size: 13px;
}

/* ── Pills ── */
.pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  font-family: 'DM Mono', monospace;
}

.pill-in  { background: #dcfce7; color: #15803d; }
.pill-out { background: #fee2e2; color: #b91c1c; }
.pill-net { background: #e0f2fe; color: #0369a1; }

/* ── Summary block ── */
.summary-block { margin-top: 8px; }

.summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
}

.summary-title {
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.02em;
}

.summary-badge {
  font-size: 12px;
  color: #888;
  background: #f0f0ec;
  border-radius: 999px;
  padding: 2px 10px;
}

/* ── Skeleton ── */
.skeleton-wrap {
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skel-row {
  display: flex;
  gap: 20px;
  align-items: center;
}

.skel-line {
  height: 11px;
  border-radius: 6px;
  background: #e8e8e4;
  animation: pulse 1.4s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

/* ── Responsive ── */
@media (max-width: 640px) {
  .stock-page { padding: 16px 16px 40px; }
  .filter-input.wide, .filter-select { width: 100%; }
  .date-input { width: 100%; }
  .date-range { width: 100%; flex-wrap: wrap; }
  .data-table { font-size: 12px; }
  .data-table td, .data-table th { padding: 8px 10px; }
}
</style>