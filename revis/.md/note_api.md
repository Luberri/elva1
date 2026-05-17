# Vue.js — Contrôleur API pour les personnes

## Objectif

Centraliser les appels API dans un contrôleur, puis réutiliser ses fonctions dans la liste et dans la page détail.

## Exemple de contrôleur API

```js
// src/api/controllerApi.js
const API_URL = 'https://example.com/api/personnes'

export async function getPersonnes() {
	const response = await fetch(API_URL)

	if (!response.ok) {
		throw new Error('Impossible de charger la liste des personnes')
	}

	return await response.json()
}

export async function getPersonneById(id) {
	const response = await fetch(`${API_URL}/${id}`)

	if (!response.ok) {
		throw new Error('Impossible de charger le détail de la personne')
	}

	return await response.json()
}
```

## Rôle du contrôleur

- `getPersonnes()` récupère toutes les personnes.
- `getPersonneById(id)` récupère une seule personne.
- La logique HTTP reste dans un seul fichier.
- Les composants Vue restent plus simples.

## Exemple d'utilisation

```vue
<script setup>
import { onMounted, ref } from 'vue'
import { getPersonnes } from '@/api/controllerApi'

const personnes = ref([])
const chargement = ref(true)
const erreur = ref('')

onMounted(async () => {
	try {
		personnes.value = await getPersonnes()
	} catch (error) {
		erreur.value = error.message
	} finally {
		chargement.value = false
	}
})
</script>
```

## Résultat attendu

- Les appels API sont regroupés dans `controllerApi.js`.
- La liste utilise `getPersonnes()`.
- La page détail utilise `getPersonneById(id)`.
