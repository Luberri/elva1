# Node.js — Écrire des données JSON dans un fichier texte

## Objectif

À partir d’un tableau JSON contenant :
- nom
- prénom
- date de naissance
- email

Créer automatiquement un fichier `personnes.txt` contenant :

```txt
nom : nom prenom
age : age
mail : partieAvant@gmail.com

```

---

# Données JSON

```js
const personnes = [
  {
    nom: 'Rakoto',
    prenom: 'Jean',
    dateNaissance: '2000-05-10',
    mail: 'jean@gmail.com'
  },

  {
    nom: 'Rabe',
    prenom: 'Paul',
    dateNaissance: '1998-02-15',
    mail: 'paul@gmail.com'
  }
]
```

---

# Exemple complet

```js
import fs from 'fs'

const personnes = [
  {
    nom: 'Rakoto',
    prenom: 'Jean',
    dateNaissance: '2000-05-10',
    mail: 'jean@gmail.com'
  },

  {
    nom: 'Rabe',
    prenom: 'Paul',
    dateNaissance: '1998-02-15',
    mail: 'paul@gmail.com'
  }
]

let contenu = ''

for (const personne of personnes) {

  // Extraire année naissance
  const annee =
    new Date(personne.dateNaissance)
      .getFullYear()

  // Calcul âge
  const age =
    new Date().getFullYear() - annee

  // Extraire avant @gmail.com
  const username =
    personne.mail.split('@')[0]

  contenu +=
`nom : ${personne.nom} ${personne.prenom}
age : ${age}
mail : ${username}

`
}

fs.writeFileSync(
  'personnes.txt',
  contenu
)

console.log('Fichier créé')
```

---

# Résultat du fichier personnes.txt

```txt
nom : Rakoto Jean
age : 26
mail : jean

nom : Rabe Paul
age : 28
mail : paul
```

---

# Explications importantes

## Extraire avant @

```js
personne.mail.split('@')[0]
```

Exemple :

```txt
jean@gmail.com
```

devient :

```txt
jean
```

---

# Calculer l’âge

```js
const age =
  new Date().getFullYear() - annee
```

---

# Ajouter du texte dans le fichier

```js
contenu += `
nom : ...
`
```

---

# Créer le fichier

```js
fs.writeFileSync(
  'personnes.txt',
  contenu
)
```

- crée le fichier s’il n’existe pas
- remplace le contenu sinon

---

# Variante async/await

```js
import fs from 'fs/promises'

await fs.writeFile(
  'personnes.txt',
  contenu
)
```

---

# Résumé des fonctions utilisées

| Fonction | Utilité |
|---|---|
| split('@') | découper email |
| new Date() | gérer dates |
| getFullYear() | récupérer année |
| writeFileSync() | créer fichier |
| for...of | parcourir tableau |