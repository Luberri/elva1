<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAllCarts, deleteCart } from '../../../service/cartService.js'

const loading = ref(false)
const error = ref('')
const rows = ref([])

async function loadCarts() {
    error.value = ''
    loading.value = true
    try {
        rows.value = await getAllCarts({ filters: {} })
    } catch (e) {
        error.value = e?.message || String(e)
    } finally {
        loading.value = false
    }
}

async function handleDelete(id) {
    if (!confirm('Voulez-vous vraiment supprimer ce panier ?')) return
    try {
        loading.value = true
        await deleteCart(id)
        await loadCarts()
    } catch (e) {
        error.value = e?.message || String(e)
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    loadCarts()
})

const cartList = computed(() => rows.value)
</script>

<template>
    <section class="list-section">
        <header class="header">
            <h1>Paniers</h1>
            <div class="actions">
                <RouterLink to="/carts/create" class="btn btn-primary">Créer un panier</RouterLink>
                <button class="btn btn-secondary" :disabled="loading" @click="loadCarts">
                    {{ loading ? 'Chargement…' : 'Recharger' }}
                </button>
            </div>
        </header>

        <p v-if="error" class="error-msg">{{ error }}</p>
        <p v-if="loading">Chargement…</p>

        <table v-else-if="cartList.length" class="table">
            <thead>
                <tr>
                    <th>ID</th>
                    <th>ID Client</th>
                    <th>ID Devise</th>
                    <th>Date d'ajout</th>
                    <th>Date MAJ</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody> 
                <tr v-for="c in cartList" :key="c.id">
                    <td>
                        <RouterLink :to="{ name: 'cart-detail', params: { id: c.id } }">
                            {{ c.id }}
                        </RouterLink>
                    </td>
                    <td>{{ c.id_customer || '-' }}</td>
                    <td>{{ c.id_currency }}</td>
                    <td>{{ c.date_add }}</td>
                    <td>{{ c.date_upd }}</td>
                    <td>
                        <button @click="handleDelete(c.id)" class="btn btn-danger">Supprimer</button>
                    </td>
                </tr>
            </tbody>
        </table>
        <p v-else>Aucun panier existant.</p>
    </section>
</template>

<style scoped>
.list-section { padding: 16px; }
.header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 20px;
}
.actions {
    display: flex;
    gap: 10px;
}
</style>