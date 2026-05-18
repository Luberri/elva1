<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAllProducts, hasCombination } from '../../../service/productService.js'
import { getCategory } from '../../../service/categorieService.js'
import { deleteProduct } from '../../../service/productService.js'
import { DEFAULT_CURRENCY_NAME } from '../../../api/util.js'

const loading = ref(false)
const error = ref('')
const rows = ref([])

async function charger() {
	error.value = ''
	loading.value = true
	try {
		rows.value = await getAllProducts({ filters: {} })
		// Enrichir avec les infos de combinaisons
		for (const produit of rows.value) {
			try {
				produit.has_combination = await hasCombination(produit.id)
			} catch (e) {
				console.error(`Erreur vérification combinaisons pour ${produit.id}:`, e)
				produit.has_combination = false
			}
		}
	} catch (e) {
		error.value = e?.message || String(e)
	} finally {
		loading.value = false
	}
}
async function handledelete(id) {
	try {
		loading.value = true
		await deleteProduct(id)
		await charger()
	} catch (e) {
		error.value = e?.message || String(e)
	} finally {
		loading.value = false
	}
}
onMounted(() => {
	charger()
})

const productList = computed(() => rows.value)
const currencyName = DEFAULT_CURRENCY_NAME
</script>

<template>
	<section class="liste">
		<header class="header">
			<h1>Produits</h1>
			<div class="actions" style="display: flex; gap: 10px;">
				<RouterLink to="/products/create" class="btn btn-primary">Créer un produit</RouterLink>
				<button class="btn btn-secondary" :disabled="loading" @click="charger">
					{{ loading ? 'Chargement…' : 'Recharger' }}
				</button>
			</div>
		</header>

		<p v-if="error">{{ error }}</p>
		<p v-if="loading">Chargement…</p>

		<table v-else-if="productList.length" class="table">
			<thead>
				<tr>
					<th>ID</th>
					<th>Image</th>
					<th>Nom</th>
					<th>Référence</th>
					<th>Catégorie</th>
					<th>Prix</th>
					<th>Remise Qté</th>
					<th>État</th>
					<th>Déclinaisons</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="p in productList" :key="p.id">
					<td>
						<RouterLink :to="{ name: 'detail', params: { id: p.id } }">
							{{ p.id }}
						</RouterLink>
					</td>

					<td>
						<img
							v-if="p.image"
							:src="p.image"
							style="width:60px"
						/>
						<span v-else>-</span>
					</td>

					<td>{{ p.titre || '-' }}</td>
					<td>{{ p.reference || '-' }}</td>
					<td>{{ p.categorieId || '-' }}</td>
					<td>{{ p.price ? p.price + ' ' + currencyName : '-' }}</td>
					<td>{{ p.quantity_discount }}</td>
					<td>{{ p.state || '-' }}</td>
					<td>
						<span v-if="p.has_combination" class="badge badge-success">Oui</span>
						<span v-else class="badge badge-danger">Non</span>
					</td>
					<td>
						<button @click="handledelete(p.id)" class="btn btn-danger">Supprimer</button>
					</td>
				</tr>
			</tbody>
		</table>
	</section>
</template>

<style scoped>
.liste { padding: 16px; }

.header {
	display: flex;
	justify-content: space-between;
	margin-bottom: 10px;
}

.badge {
	display: inline-block;
	padding: 0.375rem 0.75rem;
	border-radius: 4px;
	font-size: 0.875rem;
	font-weight: 500;
	text-align: center;
}

.badge-success {
	background-color: #28a745;
	color: white;
}

.badge-danger {
	background-color: #dc3545;
	color: white;
}
</style>