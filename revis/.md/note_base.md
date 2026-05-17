# Vue.js — Bases rapides

## Variable

```vue
<script setup>
import { ref } from 'vue'

const message = ref("Hello")
</script>

<template>
  {{ message }}
</template>
```

---

## Modifier variable

```vue
<script setup>
import { ref } from 'vue'

const count = ref(0)

function add() {
  count.value++
}
</script>

<template>
  <button @click="add">+1</button>
  {{ count }}
</template>
```

---

## Fonction

```vue
<script setup>
function direSalut() {
  console.log("Salut")
}
</script>

<template>
  <button @click="direSalut">Click</button>
</template>
```

---

## Input (v-model)

```vue
<script setup>
import { ref } from 'vue'

const nom = ref("")
</script>

<template>
  <input v-model="nom" />
  {{ nom }}
</template>
```

---

## Condition

```vue
<script setup>
import { ref } from 'vue'

const ok = ref(true)
</script>

<template>
  <p v-if="ok">Oui</p>
  <p v-else>Non</p>
</template>
```

---

## Boucle

```vue
<script setup>
const list = ["A", "B", "C"]
</script>

<template>
  <div v-for="item in list" :key="item">
    {{ item }}
  </div>
</template>
```
