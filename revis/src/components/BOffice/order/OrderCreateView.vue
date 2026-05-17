<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { createOrder } from '../../../service/orderService.js'
import { DEFAULT_CURRENCY_ID } from '../../../api/util.js'

const router = useRouter()
const loading = ref(false)
const error = ref('')

const order = ref({
    id_address_delivery: '',
    id_address_invoice: '',
    id_cart: '',
    id_currency: String(DEFAULT_CURRENCY_ID),
    id_lang: '1',
    id_customer: '',
    id_carrier: '1',
    module: 'ps_wirepayment',
    payment: 'Bank wire',
    total_paid: '0',
    total_paid_real: '0',
    total_products: '0',
    total_products_wt: '0',
    conversion_rate: '1',
    current_state: '2'
})

async function onSave() {
	try {
		error.value = ''
		loading.value = true
		
		await createOrder(order.value)
		router.push('/orders')
	} catch (e) {
		error.value = e?.message || String(e)
	} finally {
		loading.value = false
	}
}
</script>

<template>
	<section class="create-form">
		<header class="header">
			<h1>Créer une commande</h1>
			<RouterLink to="/orders" class="btn btn-secondary">Retour</RouterLink>
		</header>

		<p v-if="error" class="error-msg">{{ error }}</p>

		<form @submit.prevent="onSave">
            <fieldset class="group-fieldset">
                <legend>Identification</legend>
                <div class="row">
                    <div class="form-group">
                        <label class="form-label">ID Client *</label>
                        <input v-model="order.id_customer" type="number" class="form-control" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">ID Panier *</label>
                        <input v-model="order.id_cart" type="number" class="form-control" required />
                    </div>
                </div>
                <div class="row">
                    <div class="form-group">
                        <label class="form-label">Langue (ID) *</label>
                        <input v-model="order.id_lang" type="number" class="form-control" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Devise (ID) *</label>
                        <input v-model="order.id_currency" type="number" class="form-control" required />
                    </div>
                </div>
            </fieldset>

            <fieldset class="group-fieldset">
                <legend>Adresses et Livraison</legend>
                <div class="row">
                    <div class="form-group">
                        <label class="form-label">Adresse de livraison (ID) *</label>
                        <input v-model="order.id_address_delivery" type="number" class="form-control" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Adresse de facturation (ID) *</label>
                        <input v-model="order.id_address_invoice" type="number" class="form-control" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Transporteur (ID) *</label>
                        <input v-model="order.id_carrier" type="number" class="form-control" required />
                    </div>
                </div>
            </fieldset>

            <fieldset class="group-fieldset">
                <legend>Paiement et Montants</legend>
                <div class="row">
                    <div class="form-group">
                        <label class="form-label">Méthode de paiement *</label>
                        <input v-model="order.payment" type="text" class="form-control" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Module paiement *</label>
                        <input v-model="order.module" type="text" class="form-control" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Taux de conversion *</label>
                        <input v-model="order.conversion_rate" type="number" step="0.000001" class="form-control" required />
                    </div>
                </div>
                <div class="row">
                    <div class="form-group">
                        <label class="form-label">Total Payé *</label>
                        <input v-model="order.total_paid" type="number" step="0.01" class="form-control" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Total Réellement Payé *</label>
                        <input v-model="order.total_paid_real" type="number" step="0.01" class="form-control" required />
                    </div>
                </div>
                <div class="row">
                    <div class="form-group">
                        <label class="form-label">Total Produits (HT) *</label>
                        <input v-model="order.total_products" type="number" step="0.01" class="form-control" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Total Produits (TTC) *</label>
                        <input v-model="order.total_products_wt" type="number" step="0.01" class="form-control" required />
                    </div>
                </div>
            </fieldset>

			<div class="actions">
				<button type="submit" class="btn btn-primary" :disabled="loading">
					{{ loading ? 'Création en cours...' : 'Créer la commande' }}
				</button>
			</div>
		</form>
	</section>
</template>

<style scoped>
.create-form {
	padding: 16px;
	max-width: 800px;
	margin: 0 auto;
}
.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}
.group-fieldset {
    border: 1px solid #ddd;
    border-radius: 6px;
    padding: 15px;
    margin-bottom: 20px;
}
.group-fieldset legend {
    font-weight: bold;
    padding: 0 10px;
}
.row {
    display: flex;
    gap: 15px;
    margin-bottom: 12px;
}
.row > .form-group {
    flex: 1;
}
.form-group label {
	display: block;
	margin-bottom: 6px;
	font-weight: 500;
}
.actions {
	margin-top: 24px;
	display: flex;
	justify-content: flex-end;
}
.error-msg {
	color: #dc3545;
	background: #f8d7da;
	padding: 10px;
	border-radius: 4px;
	margin-bottom: 15px;
}
</style>