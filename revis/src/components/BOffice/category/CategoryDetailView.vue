<script setup>
import { onMounted, ref, watch } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getCategory } from '../../../service/categorieService.js'

const route = useRoute()
const category = ref(null)
const subcategoriesData = ref([])
const loading = ref(false)
const error = ref('')

async function loadCategory() {
  loading.value = true
  error.value = ''
  try {
    category.value = await getCategory(route.params.id)
    
    // Charger les données des sous-catégories
    if (category.value?.subcategories?.length > 0) {
      subcategoriesData.value = await Promise.all(
        category.value.subcategories.map(id => getCategory(id))
      )
    }
  } catch (e) {
    error.value = e?.message || String(e)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadCategory()
})

watch(() => route.params.id, (newId) => {
  if (newId) {
    category.value = null
    subcategoriesData.value = []
    loadCategory()
  }
})
</script>
<template>
	<section class="detail">
		<header class="header">
			<h1>Détail de la catégorie</h1>
		</header>

		<p v-if="error">{{ error }}</p>
		<p v-if="loading">Chargement…</p>

		<div v-else-if="category">
			<h2>{{ category.name }}</h2>
			<p>ID: {{ category.id }}</p>
			<p>Lien: {{ category.link_rewrite }}</p>
			<p>Position: {{ category.position }}</p>
			<p>Actif: {{ category.active === '1' ? 'Oui' : 'Non' }}</p> 
			<div v-if="category.description">
				<strong>Description:</strong>
				<div class="description-content" v-html="category.description"></div>
			</div>
            <table v-if="category.subcategories?.length">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>Nom</th>
                        <th>Position</th>
                    </tr>
                </thead>
                <tbody>
                    <tr v-for="subcat in subcategoriesData" :key="subcat.id">
                        <td>
                          <RouterLink :to="{ name: 'category-detail', params: { id: subcat.id } }">
                            {{ subcat.id }}
                          </RouterLink>
                        </td>
                        <td>{{ subcat.name }}</td>
                        <td>{{ subcat.position }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
	</section>
</template>

<style scoped>
.detail { padding: 16px; }

.header {
	display: flex;
	justify-content: space-between;
	margin-bottom: 10px;
}

.description-content {
	background: #f9f9f9;
	padding: 10px;
	border-radius: 4px;
	border: 1px solid #eee;
	margin-top: 5px;
	margin-bottom: 15px;
}

</style>
