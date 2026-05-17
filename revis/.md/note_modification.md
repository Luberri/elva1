# Vue.js — Page de modification d'une personne

## Objectif

Ouvrir une page de modification avec les données actuelles préremplies, permettre l'édition, afficher une popup de vérification avant validation, puis rediriger vers la liste.

## Principe

- On récupère la personne à modifier avec `getPersonneById(id)`.
- On remplit le formulaire avec les données reçues.
- Au clic sur `Valider`, on affiche une confirmation.
- Si l'utilisateur confirme, on envoie la mise à jour puis on retourne à la liste.

## Exemple de composant

```vue
<script setup>
import { onMounted, reactive } from 'vue'
import { useRoute, useRouter, RouterLink } from 'vue-router'
import { getPersonneById, updatePersonne } from '@/api/controllerApi'

const route = useRoute()
const router = useRouter()

const formulaire = reactive({
  nom: '',
  age: '',
  ville: '',
})

onMounted(async () => {
  const personne = await getPersonneById(route.params.id)
  formulaire.nom = personne.nom
  formulaire.age = personne.age
  formulaire.ville = personne.ville
})

const validerModification = async () => {
  const verifier = window.confirm('Voulez-vous vraiment valider la modification ?')

  if (!verifier) return

  await updatePersonne(route.params.id, {
    nom: formulaire.nom,
    age: formulaire.age,
    ville: formulaire.ville,
  })

  router.push('/')
}
</script>

<template>
  <div class="modification-personne">
    <h1>Modifier une personne</h1>

    <form @submit.prevent="validerModification">
      <div>
        <label class="form-label">Nom</label>
        <input v-model="formulaire.nom" type="text" />
      </div>

      <div>
        <label class="form-label">Âge</label>
        <input v-model="formulaire.age" type="number" />
      </div>

      <div>
        <label class="form-label">Ville</label>
        <input v-model="formulaire.ville" type="text" />
      </div>

      <button type="submit">Valider</button>
      <RouterLink to="/">Annuler</RouterLink>
    </form>
  </div>
</template>
```

## Exemple de popup de vérification

```js
const verifier = window.confirm('Voulez-vous vraiment valider la modification ?')
```

- Si l'utilisateur clique sur `OK`, la modification est enregistrée.
- Si l'utilisateur clique sur `Annuler`, rien n'est envoyé.

## Fonction API attendue

```js
export async function updatePersonne(id, data) {
  const response = await fetch(`https://example.com/api/personnes/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Impossible de modifier la personne')
  }

  return await response.json()
}
```

## Redirection finale

Après validation réussie, on fait :

```js
router.push('/')
```

## Résultat attendu

- Les champs affichent les données actuelles de la personne.
- L'utilisateur peut modifier les informations.
- Une popup demande confirmation avant l'envoi.
- Après validation, l'application revient à la liste.
