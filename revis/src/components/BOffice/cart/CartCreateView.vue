<script setup>
import { ref } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { createCart } from '../../../service/cartService.js'
import { DEFAULT_CURRENCY_ID } from '../../../api/util.js'

const router = useRouter()
const loading = ref(false)
const error = ref('')

const cart = ref({
    id_currency: String(DEFAULT_CURRENCY_ID),
    id_lang: '1',
    id_customer: '',
    id_address_delivery: '',
    id_address_invoice: ''
})

async function onSave() {
    try {
        error.value = ''
        loading.value = true
        
        await createCart(cart.value)
        router.push('/carts')
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
            <h1>Créer un panier</h1>
            <RouterLink to="/carts" class="btn btn-secondary">Retour</RouterLink>
        </header>

        <p v-if="error" class="error-msg">{{ error }}</p>

        <form @submit.prevent="onSave">
            <fieldset class="group-fieldset">
                <legend>Informations générales</legend>
                <div class="row">
                    <div class="form-group">
                        <label class="form-label">ID Devise *</label>
                        <input v-model="cart.id_currency" type="number" class="form-control" required />
                    </div>
                    <div class="form-group">
                        <label class="form-label">ID Langue *</label>
                        <input v-model="cart.id_lang" type="number" class="form-control" required />
                    </div>
                </div>
                <div class="row">
                    <div class="form-group">
                        <label class="form-label">ID Client</label>
                        <input v-model="cart.id_customer" type="number" class="form-control" />
                    </div>
                </div>
            </fieldset>

            <fieldset class="group-fieldset">
                <legend>Adresses</legend>
                <div class="row">
                    <div class="form-group">
                        <label class="form-label">Adresse de livraison (ID)</label>
                        <input v-model="cart.id_address_delivery" type="number" class="form-control" />
                    </div>
                    <div class="form-group">
                        <label class="form-label">Adresse de facturation (ID)</label>
                        <input v-model="cart.id_address_invoice" type="number" class="form-control" />
                    </div>
                </div>
            </fieldset>

            <div class="actions">
                <button type="submit" class="btn btn-primary" :disabled="loading">
                    {{ loading ? 'Création en cours...' : 'Créer le panier' }}
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