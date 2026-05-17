# Vue.js — Exemple de liste avec API et redirection vers le détail

## Objectif

Afficher une liste de personnes chargée depuis une API, mettre en rouge les personnes de 18 ans et plus, puis rediriger vers une page détail quand on clique sur une personne.

## Contrôleur API utilisé

On utilise les fonctions du fichier `controllerApi.js` :

- `getPersonnes()` pour la liste.
- `getPersonneById(id)` pour le détail.

## Composant liste

```vue
<script setup>
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
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

const ageMoyen = computed(() => {
  if (personnes.value.length === 0) return 0
  const total = personnes.value.reduce((sum, p) => sum + p.age, 0)
  return (total / personnes.value.length).toFixed(1)
})

const supprimer = (id) => {
  personnes.value = personnes.value.filter(p => p.id !== id)
}

const modifier = (id) => {
  // Redirection vers une page de modification
  // router.push(`/personnes/${id}/edit`)
  console.log('Modifier personne', id)
}
</script>

<template>
  <div class="liste-personnes">
    <h1>Liste des personnes</h1>

    <p v-if="chargement">Chargement...</p>
    <p v-else-if="erreur">{{ erreur }}</p>

    <ul v-else>
      <li
        v-for="personne in personnes"
        :key="personne.id"
        :class="{ adulte: personne.age >= 18 }"
      >
        <div class="item-content">
          <RouterLink :to="`/personnes/${personne.id}`">
            {{ personne.nom }} - {{ personne.age }} ans
          </RouterLink>
          <div class="actions">
            <button @click="modifier(personne.id)" class="btn-modifier">
              Modifier
            </button>
            <button @click="supprimer(personne.id)" class="btn-delete">
              Supprimer
            </button>
          </div>
        </div>
      </li>
    </ul>

    <div v-if="personnes.length > 0" class="age-moyen">
      <strong>Âge moyen : {{ ageMoyen }} ans</strong>
    </div>
  </div>
</template>
```

## Style rouge pour les adultes

```css
.liste-personnes ul {
  list-style: none;
  padding: 0;
}

.liste-personnes li {
  padding: 10px;
  margin: 5px 0;
  border: 1px solid #ccc;
  border-radius: 4px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  gap: 20px;
}

.adulte a {
  color: red;
  font-weight: 700;
}

.actions {
  display: flex;
  gap: 10px;
}

.btn-modifier,
.btn-delete {
  padding: 5px 10px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 14px;
  transition: background-color 0.3s;
}

.btn-modifier {
  background-color: #4CAF50;
  color: white;
}

.btn-modifier:hover {
  background-color: #45a049;
}

.btn-delete {
  background-color: #f44336;
  color: white;
}

.btn-delete:hover {
  background-color: #da190b;
}

.age-moyen {
  margin-top: 20px;
  padding: 15px;
  background-color: #f0f0f0;
  border-radius: 4px;
  text-align: center;
  font-size: 16px;
}
```

## Page détail

```vue
<script setup>
import { computed, onMounted, ref } from 'vue'
import { useRoute, RouterLink } from 'vue-router'
import { getPersonneById } from '@/api/controllerApi'

const route = useRoute()
const personne = ref(null)

const idPersonne = computed(() => Number(route.params.id))

onMounted(async () => {
  personne.value = await getPersonneById(idPersonne.value)
})
</script>

<template>
  <div v-if="personne">
    <h1>Détail de {{ personne.nom }}</h1>
    <p>Âge : {{ personne.age }} ans</p>
    <p>Ville : {{ personne.ville }}</p>
    <RouterLink to="/">Retour à la liste</RouterLink>
  </div>
</template>
```

## Configuration des routes

```js
import { createRouter, createWebHistory } from 'vue-router'
import ListePersonnes from './pages/ListePersonnes.vue'
import DetailPersonne from './pages/DetailPersonne.vue'

const routes = [
  { path: '/', component: ListePersonnes },
  { path: '/personnes/:id', component: DetailPersonne },
]

export default createRouter({
  history: createWebHistory(),
  routes,
})
```

## Résultat attendu

- La liste est alimentée par `getPersonnes()`.
- Les personnes de 18 ans et plus apparaissent en rouge.
- Un clic sur une personne ouvre sa page détail chargée avec `getPersonneById(id)`.
