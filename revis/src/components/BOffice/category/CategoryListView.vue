<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAllCategories, deleteCategory 	} from '../../../service/categorieService.js'
import { apiCategorie } from '../../../service/categorieService.js'

const loading = ref(false)
const error = ref('')
const rows = ref([])

async function charger() {
	error.value = ''
	loading.value = true
	try {
		rows.value = await getAllCategories({ filters: {} })
	} catch (e) {
		error.value = e?.message || String(e)
	} finally {
		loading.value = false
	}
}

async function handleDelete(id) {
	try {
		loading.value = true
		await deleteCategory(id)
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

const categoryList = computed(() => rows.value)
</script>

<template>
	<section class="liste">
		<header class="header">
			<h1>Catégories</h1>
			<div class="actions">
				<RouterLink to="/categories/create" class="btn-create">Créer une catégorie</RouterLink>
				<button :disabled="loading" @click="charger">
					{{ loading ? 'Chargement…' : 'Recharger' }}
				</button>
			</div>
		</header>

		<p v-if="error">{{ error }}</p>
		<p v-if="loading">Chargement…</p>

		<table v-else-if="categoryList.length" class="table">
			<thead>
				<tr>
					<th>ID</th>
					<th>Nom</th>
					<th>Lien</th>
					<th>Position</th>
					<th>Actif</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="c in categoryList" :key="c.id">
                    
					<td>
						<RouterLink :to="{ name: 'category-detail', params: { id: c.id } }">
							{{ c.id }}
						</RouterLink>
					</td>
					<td>{{ c.name || '-' }}</td>
					<td>{{ c.link_rewrite || '-' }}</td>
					<td>{{ c.position || '-' }}</td>
					<td>{{ c.active === '1' ? 'Oui' : 'Non' }}</td>
					<td>
						<button @click="handleDelete(c.id)" class="btn btn-danger">Supprimer</button>
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
	align-items: center;
	margin-bottom: 10px;
}
.actions {
	display: flex;
	gap: 10px;
}
.btn-create {
	padding: 6px 12px;
	background: #1a1a1a;
	color: white;
	text-decoration: none;
	border-radius: 4px;
	font-size: 14px;
	display: flex;
	align-items: center;
}
</style>