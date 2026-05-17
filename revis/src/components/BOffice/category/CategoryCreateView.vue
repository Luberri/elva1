<script setup>
import { ref, onMounted } from 'vue'
import { useRouter, RouterLink } from 'vue-router'
import { createCategory, getAllCategories } from '../../../service/categorieService.js'
import CategoryTreeItem from './CategoryTreeItem.vue'
import Editor from '@tinymce/tinymce-vue'

const router = useRouter()

const formData = ref({
	name: '',
	link_rewrite: '',
	active: true,
	id_parent: 2,
	id_shop_default: '',
	is_root_category: false,
	position: '',
	description: '',
	meta_title: '',
	meta_description: '',
	meta_keywords: ''
})

const loading = ref(false)
const error = ref('')

const loadingCat = ref(false)
const categoriesTree = ref([])

function buildTree(list) {
	const map = {}
	list.forEach(c => {
		map[c.id] = { ...c, children: [] }
	})
	
	const tree = []
	list.forEach(c => {
		if (c.id_parent && map[c.id_parent]) {
			map[c.id_parent].children.push(map[c.id])
		} else {
			tree.push(map[c.id])
		}
	})
	return tree
}

onMounted(async () => {
	loadingCat.value = true
	try {
		const rawCats = await getAllCategories({ filters: {} })
		categoriesTree.value = buildTree(rawCats)
	} catch (e) {
		console.error("Problème au chargement des catégories: ", e)
	} finally {
		loadingCat.value = false
	}
})

async function submitForm() {
	error.value = ''
	loading.value = true
	try {
        // Simple auto-formatting for link_rewrite if needed
        if (!formData.value.link_rewrite) {
            formData.value.link_rewrite = formData.value.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        }
		await createCategory(formData.value)
		router.push('/categories')
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
			<h1>Créer une Catégorie</h1>
			<RouterLink to="/categories">Retour à la liste</RouterLink>
		</div>

		<p v-if="error" class="error">{{ error }}</p>

		<form @submit.prevent="submitForm" class="form-card">
			<div class="form-group">
				<label class="form-label" for="name">Nom *</label>
				<input id="name" v-model="formData.name" type="text" required />
			</div>
			
			<div class="form-group">
				<label class="form-label" for="link_rewrite">URL simplifiée (link_rewrite) *</label>
				<input id="link_rewrite" v-model="formData.link_rewrite" type="text" placeholder="Généré automatiquement si vide" />
			</div>

			<div class="form-group">
				<label class="form-label" for="description">Description</label>
				<Editor
					id="description"
					v-model="formData.description"
					api-key="vfcu4k2lfnmswvve6zp614gzxwzv7nhsm4jkb1n4xg6h766f"
					:init="{
						height: 300,
						menubar: false,
						plugins: 'lists link code',
						toolbar: 'undo redo | formatselect | bold italic | alignleft aligncenter alignright | bullist numlist | link code'
					}"
				/>
			</div>

			<div class="form-group full-width">
				<label class="form-label">Catégorie Parente *</label>
				<div class="tree-container">
					<p v-if="loadingCat">Chargement des catégories...</p>
					<CategoryTreeItem 
						v-else
						v-for="rootNode in categoriesTree" 
						:key="rootNode.id" 
						:node="rootNode"
						v-model="formData.id_parent"
					/>
				</div>
			</div>

			<div class="form-row">
				<div class="form-group flex-1">
					<label class="form-label" for="position">Position</label>
					<input id="position" v-model="formData.position" type="number" />
				</div>
				<div class="form-group flex-1">
					<label class="form-label" for="id_shop_default">Boutique par défaut (ID)</label>
					<input id="id_shop_default" v-model="formData.id_shop_default" type="number" />
				</div>
			</div>

			<fieldset class="meta-section">
				<legend>Méta-informations (SEO)</legend>
				<div class="form-group">
					<label class="form-label" for="meta_title">Méta Titre</label>
					<input id="meta_title" v-model="formData.meta_title" type="text" />
				</div>
				<div class="form-group">
					<label class="form-label" for="meta_description">Méta Description</label>
					<textarea id="meta_description" v-model="formData.meta_description" rows="2"></textarea>
				</div>
				<div class="form-group">
					<label class="form-label" for="meta_keywords">Mots Clés</label>
					<input id="meta_keywords" v-model="formData.meta_keywords" type="text" />
				</div>
			</fieldset>

			<div class="options-row">
				<div class="form-group checkbox-group">
					<input id="active" v-model="formData.active" type="checkbox" />
					<label class="form-label" for="active">Activé</label>
				</div>
				<div class="form-group checkbox-group">
					<input id="is_root_category" v-model="formData.is_root_category" type="checkbox" />
					<label class="form-label" for="is_root_category">Catégorie Racine</label>
				</div>
			</div>

			<button type="submit" :disabled="loading">
				{{ loading ? 'Création en cours…' : 'Créer la catégorie' }}
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
.checkbox-group {
	flex-direction: row;
	align-items: center;
	gap: 8px;
}
.form-group label {
	font-weight: 500;
}
.form-group input[type="text"],
.form-group input[type="number"],
.form-group textarea {
	padding: 8px;
	border: 1px solid #ccc;
	border-radius: 4px;
	font-family: inherit;
}
.form-row {
	display: flex;
	gap: 16px;
}
.flex-1 {
	flex: 1;
}
.options-row {
	display: flex;
	gap: 32px;
	margin-top: 8px;
	margin-bottom: 8px;
}
.meta-section {
	border: 1px solid #e0e0e0;
	border-radius: 8px;
	padding: 16px;
	display: flex;
	flex-direction: column;
	gap: 12px;
}
.meta-section legend {
	font-weight: bold;
	color: #555;
	padding: 0 8px;
}
.tree-container {
	border: 1px solid #ccc;
	border-radius: 4px;
	padding: 12px;
	max-height: 300px;
	overflow-y: auto;
	background: #fafafa;
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
