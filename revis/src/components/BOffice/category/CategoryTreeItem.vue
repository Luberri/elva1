<script setup>
import { ref } from 'vue'

const props = defineProps({
  node: {
    type: Object,
    required: true
  },
  modelValue: {
    type: [String, Number],
    required: true
  }
})

const emit = defineEmits(['update:modelValue'])

const isOpen = ref(true)

function updateValue(val) {
  emit('update:modelValue', val)
}
</script>

<template>
  <div class="tree-node">
    <div class="node-header">
      <span 
        class="toggle-icon" 
        :class="{ invisible: !node.children || !node.children.length }"
        @click="isOpen = !isOpen"
      >
        {{ isOpen ? 'v' : '>' }}
      </span>
      <input 
        type="radio" 
        :id="'cat-' + node.id" 
        :value="node.id" 
        :checked="modelValue == node.id"
        @change="updateValue(node.id)"
      />
      <label class="form-label" :for="'cat-' + node.id">{{ node.name }}</label>
    </div>

    <div class="node-children" v-if="isOpen && node.children && node.children.length">
      <CategoryTreeItem 
        v-for="child in node.children" 
        :key="child.id" 
        :node="child"
        :modelValue="modelValue"
        @update:modelValue="updateValue"
      />
    </div>
  </div>
</template>

<style scoped>
.tree-node {
  margin-left: 20px;
}
.node-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
}
.toggle-icon {
  cursor: pointer;
  width: 16px;
  text-align: center;
  font-weight: bold;
  color: #666;
  user-select: none;
}
.toggle-icon.invisible {
  visibility: hidden;
}
.node-children {
  margin-left: 8px;
  border-left: 1px dashed #ccc;
  padding-left: 4px;
}
input[type="radio"] {
  cursor: pointer;
}
label {
  cursor: pointer;
  font-size: 14px;
  color: #333;
}
</style>
