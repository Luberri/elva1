<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { getAllCustomers } from '../../../service/customerService.js'

const loading = ref(false)
const error = ref('')
const rows = ref([])

async function charger() {
	error.value = ''
	loading.value = true
	try {
		rows.value = await getAllCustomers({ filters: {} })
	} catch (e) {
		error.value = e?.message || String(e)
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	charger()
})

const customerList = computed(() => rows.value)
</script>

<template>
	<section class="liste">
		<header class="header">
			<h1>Clients</h1>
			<div class="actions">
				<RouterLink to="/customers/create" class="btn-create">Créer un Client</RouterLink>
				<button :disabled="loading" @click="charger">
					{{ loading ? 'Chargement…' : 'Recharger' }}
				</button>
			</div>
		</header>

		<p v-if="error">{{ error }}</p>
		<p v-if="loading">Chargement…</p>

		<table v-else-if="customerList.length">
			<thead>
				<tr>
					<th>ID</th>
					<th>Nom</th>
					<th>Prénom</th>
					<th>Email</th>
					<th>Actif</th>
				</tr>
			</thead>
			<tbody>
				<tr v-for="c in customerList" :key="c.id">
					<td>
						<RouterLink :to="{ name: 'customer-detail', params: { id: c.id } }">
							{{ c.id }}
						</RouterLink>
					</td>
					<td>{{ c.lastname || '-' }}</td>
					<td>{{ c.firstname || '-' }}</td>
					<td>{{ c.email || '-' }}</td>
					<td>{{ c.active === '1' ? 'Oui' : 'Non' }}</td>
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
table {
	width: 100%;
	border-collapse: collapse;
}
th, td {
	text-align: left;
	padding: 8px;
	border-bottom: 1px solid #ddd;
}
</style>
