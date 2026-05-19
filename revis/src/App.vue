<script setup>
import { RouterView, RouterLink, useRoute } from 'vue-router'
import { computed, ref } from 'vue'

const sidebarVisible = ref(false)
const route = useRoute()
const showSidebar = computed(() => !route.path.startsWith('/fo'))

function toggleSidebar() {
  sidebarVisible.value = !sidebarVisible.value
}
</script>

<template>
  <div class="app-layout">
    <aside v-if="showSidebar" class="sidebar" :class="{ hidden: !sidebarVisible }">
      <div class="sidebar-logo">Boutique</div>
      <nav>
        <RouterLink to="/dashboard">
          <span class="icon">📊</span>
          <span>Tableau de bord</span>
        </RouterLink>
        <RouterLink to="/products">
          <span class="icon">📦</span>
          <span>Produits</span>
        </RouterLink>
        <RouterLink to="/stats/category-profit">
          <span class="icon"></span>
          <span>Stats catégories</span>
        </RouterLink>
        <RouterLink to="/combinations/create">
          <span class="icon">🧩</span>
          <span>Declinaisons</span>
        </RouterLink>
        <RouterLink to="/categories">
          <span class="icon">📂</span>
          <span>Catégories</span>
        </RouterLink>
        <RouterLink to="/customers">
          <span class="icon">👥</span>
          <span>Clients</span>
        </RouterLink>
        <RouterLink to="/orders">
          <span class="icon">🛒</span>
          <span>Commandes</span>
        </RouterLink>
        <RouterLink to="/order-states">
          <span class="icon">🏷️</span>
          <span>Etats commande</span>
        </RouterLink>
        <RouterLink to="/carts">
          <span class="icon">🧺</span>
          <span>Paniers</span>
        </RouterLink>
        <RouterLink to="/stock-by-product-declination">
          <span class="icon">📈</span>
          <span>Stock declinaisons</span>
        </RouterLink>
      </nav>
    </aside>
    <button v-if="showSidebar" class="toggle-btn" @click="toggleSidebar" :title="sidebarVisible ? 'Masquer' : 'Afficher'">
      {{ sidebarVisible ? '◀' : '▶' }}
    </button>

    <main class="content">
      <RouterView />
    </main>
  </div>
</template>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500&display=swap');

.app-layout {
  display: flex;
  height: 100vh;
  width: 100vw;
  font-family: 'DM Sans', sans-serif;
}

/* SIDEBAR */
.sidebar {
  width: 220px;
  min-width: 220px;
  background: #1a1a1a;
  display: flex;
  flex-direction: column;
  padding: 28px 16px;
  gap: 4px;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.sidebar.hidden {
  width: 0;
  min-width: 0;
  padding: 28px 0;
}

.sidebar-logo {
  font-size: 13px;
  font-weight: 500;
  color: #555;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  padding: 0 8px 20px;
  border-bottom: 1px solid #2a2a2a;
  margin-bottom: 12px;
  white-space: nowrap;
}

/* NAV LINKS */
.sidebar nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sidebar nav a {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 10px;
  border-radius: 8px;
  color: #888;
  font-size: 14px;
  text-decoration: none;
  white-space: nowrap;
  transition: background 0.15s ease, color 0.15s ease;
}

.sidebar nav a:hover {
  background: #252525;
  color: #e0e0e0;
}

.sidebar nav a.router-link-active {
  background: #2a2a2a;
  color: #fff;
}

.icon {
  font-size: 16px;
  flex-shrink: 0;
  width: 20px;
  text-align: center;
}

/* TOGGLE BUTTON */
.toggle-btn {
  top: 24px;
  right: -14px;
  width: 28px;
  height: 28px;
  background: #1a1a1a;
  border: 1px solid #2e2e2e;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #666;
  font-size: 11px;
  transition: all 0.2s ease;
  z-index: 10;
  padding: 0;
}

.toggle-btn:hover {
  background: #252525;
  color: #ccc;
  border-color: #444;
}

.sidebar.hidden .toggle-btn {
  right: -38px;
}

/* CONTENT */
.content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  background: #f5f5f5;
}
</style>