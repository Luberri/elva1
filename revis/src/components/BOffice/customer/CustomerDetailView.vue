<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getCustomerDetail } from '../../../service/customerService.js'

const route = useRoute()
const loading = ref(false)
const error = ref('')
const customer = ref(null)

async function charger() {
	error.value = ''
	loading.value = true
	try {
		const id = route.params.id
		if (id) {
			customer.value = await getCustomerDetail(id)
		}
	} catch (e) {
		error.value = e?.message || String(e)
	} finally {
		loading.value = false
	}
}

onMounted(() => {
	charger()
})
</script>

<template>
	<section class="detail">
		<div class="header">
			<h1>Détail du Client #{{ route.params.id }}</h1>
			<RouterLink to="/customers">Retour à la liste</RouterLink>
		</div>

		<p v-if="error">{{ error }}</p>
		<p v-if="loading">Chargement…</p>

		<div v-else-if="customer" class="card">
			<p><strong>ID:</strong> {{ customer.id }}</p>
			<p><strong>Nom:</strong> {{ customer.lastname }}</p>
			<p><strong>Prénom:</strong> {{ customer.firstname }}</p>
			<p><strong>Email:</strong> {{ customer.email }}</p>
			<p><strong>Actif:</strong> {{ customer.active === '1' ? 'Oui' : 'Non' }}</p>
			<p><strong>Société:</strong> {{ customer.company || '-' }}</p>
			<p><strong>Date d'ajout:</strong> {{ customer.date_add }}</p>
		</div>
		<p v-else>Aucun client trouvé.</p>
	</section>
</template>

<style scoped>
.detail { padding: 16px; }
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}
.card {
	border: 1px solid #ccc;
	padding: 16px;
	border-radius: 8px;
}
.card p {
	margin-bottom: 8px;
}
</style>
