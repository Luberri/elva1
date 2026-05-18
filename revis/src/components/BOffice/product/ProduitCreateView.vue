<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { createProduct, getProductDetail } from '../../../service/productService.js'
import { uploadImage } from '../../../service/imageService.js'
import { updateStockAv } from '../../../service/stockAvailableService.js'
import Editor from '@tinymce/tinymce-vue'

const router = useRouter()
const loading = ref(false)
const error = ref('')

const product = ref({
	name: '',
	reference: '',
	price: 0,
	id_category_default: 2,
    quantity: 0,
	description: '',
	active: true
})

const selectedFiles = ref([])

function onFileSelected(event) {
	const files = event.target.files
	if (files && files.length > 0) {
		selectedFiles.value = Array.from(files)
  } else {
    selectedFiles.value = []
  }
}

async function onSave() {
	try {
		error.value = ''
		loading.value = true
		
		// 1. Créer le produit
		const result = await createProduct(product.value)
		
		// 2. Récupérer l'ID du produit nouvellement créé
		const newProductId = result?.prestashop?.product?.id
		
		if (newProductId) {
			// 3. Mettre à jour le stock (PrestaShop crée automatiquement le stock_available)
			// Nous devons le récupérer pour obtenir son ID
			const createdProductInfo = await getProductDetail(newProductId)
			if (createdProductInfo.stockAvailableId) {
				await updateStock(createdProductInfo.stockAvailableId, {
					id_product: newProductId,
					quantity: product.value.quantity || 0,
					depends_on_stock: 0,
					out_of_stock: 2
				})
			}

			// 4. Uploader les images si des fichiers ont été sélectionnés
		  if (selectedFiles.value.length > 0) {
        for (const file of selectedFiles.value) {
			    await uploadImage('products', newProductId, file)
        }
		  }
		}

		router.push('/')
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
			<h1>Créer un nouveau produit</h1>
			<button class="btn btn-secondary" @click="router.back()">Retour</button>
		</header>

		<p v-if="error" class="error-msg">{{ error }}</p>

		<form @submit.prevent="onSave">
			<div class="form-group">
				<label class="form-label">Nom du produit</label>
				<input v-model="product.name" type="text" class="form-control" required />
			</div>

			<div class="form-group">
				<label class="form-label">Référence</label>
				<input v-model="product.reference" type="text" class="form-control" />
			</div>

			<div class="form-group">
				<label class="form-label">Prix HT</label>
				<input v-model="product.price" type="number" step="0.01" class="form-control" required />
			</div>

			<div class="form-group">
				<label class="form-label">ID Catégorie par défaut</label>
				<input v-model="product.id_category_default" type="number" class="form-control" required />
			</div>

			<div class="form-group">
				<label class="form-label">Quantité (Stock)</label>
				<input v-model="product.quantity" type="number" class="form-control" />
			</div>

			<div class="form-group">
				<label class="form-label">Description</label>
				<Editor
					v-model="product.description"
					api-key="vfcu4k2lfnmswvve6zp614gzxwzv7nhsm4jkb1n4xg6h766f"
					:init="{ height: 400, menubar: false, plugins: 'lists link code', toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | link code' }"
				/>
			</div>

			<div class="form-group checkbox-group">
				<input v-model="product.active" type="checkbox" id="active" />
				<label class="form-label" for="active">Activer le produit</label>
			</div>

			<div class="form-group">
				<label class="form-label">Images du produit (.png, .jpg)</label>
				<input type="file" @change="onFileSelected" accept="image/png, image/jpeg" class="form-control" multiple />
        <div v-if="selectedFiles.length > 0" style="margin-top: 5px; font-size: 13px; color: #666;">
          {{ selectedFiles.length }} fichier(s) sélectionné(s)
        </div>
			</div>

			<div class="actions">
				<button type="submit" class="btn btn-primary" :disabled="loading">
					{{ loading ? 'Enregistrement...' : 'Sauvegarder' }}
				</button>
			</div>
		</form>
	</section>
</template>

<style scoped>
.create-form {
	padding: 16px;
	max-width: 600px;
	margin: 0 auto;
}

.header {
	display: flex;
	justify-content: space-between;
	align-items: center;
	margin-bottom: 20px;
}

.form-group {
	margin-bottom: 16px;
}

.form-group label {
	display: block;
	margin-bottom: 6px;
	font-weight: 500;
}

.checkbox-group {
	display: flex;
	align-items: center;
	gap: 10px;
}

.checkbox-group label {
	margin-bottom: 0;
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
