<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { createCustomer } from '../../../service/customerService.js'

const router = useRouter()

const formData = ref({
	firstname: '',
	lastname: '',
	email: '',
	passwd: ''
})

const loading = ref(false)
const error = ref('')

async function submitForm() {
	error.value = ''
	loading.value = true
	try {
		await createCustomer(formData.value)
		router.push('/customers')
	} catch (e) {
		error.value = e?.message || String(e)
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<section class="create">
		<div class="header">
			<h1>Créer un Client</h1>
			<RouterLink to="/customers">Retour à la liste</RouterLink>
		</div>

		<p v-if="error" class="error">{{ error }}</p>

		<form @submit.prevent="submitForm" class="form-card">
			<div class="form-group">
				<label class="form-label" for="firstname">Prénom</label>
				<input id="firstname" v-model="formData.firstname" type="text" required />
			</div>
			
			<div class="form-group">
				<label class="form-label" for="lastname">Nom</label>
				<input id="lastname" v-model="formData.lastname" type="text" required />
			</div>

			<div class="form-group">
				<label class="form-label" for="email">Email</label>
				<input id="email" v-model="formData.email" type="email" required />
			</div>

			<div class="form-group">
				<label class="form-label" for="passwd">Mot de passe</label>
				<input id="passwd" v-model="formData.passwd" type="password" required />
			</div>

			<button type="submit" :disabled="loading">
				{{ loading ? 'Création en cours…' : 'Créer le client' }}
			</button>
		</form>
	</section>
</template>

<style scoped>
.create { padding: 16px; max-width: 600px; }
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}
.error {
	color: red;
	margin-bottom: 10px;
}
.form-card {
	border: 1px solid #ccc;
	padding: 16px;
	border-radius: 8px;
	display: flex;
	flex-direction: column;
	gap: 16px;
}
.form-group {
	display: flex;
	flex-direction: column;
	gap: 4px;
}
.form-group label {
	font-weight: 500;
}
.form-group input {
	padding: 8px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-family: inherit;
}
button {
	padding: 10px 16px;
	background: #1a1a1a;
	color: white;
	border: none;
	border-radius: 4px;
	cursor: pointer;
	align-self: flex-start;
}
button:disabled {
	background: #888;
	cursor: not-allowed;
}
</style>
