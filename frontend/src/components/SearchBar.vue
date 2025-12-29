<template>
  <div class="search-bar">
    <form @submit.prevent="handleSubmit" class="search-form">
      <input
        v-model="query"
        type="text"
        placeholder="Enter your search query (e.g., 'diabetes treatment', 'cancer research', 'COVID-19 vaccines')"
        class="search-input"
        :disabled="loading"
      />
      <button type="submit" class="search-button" :disabled="loading || !query.trim()">
        <span v-if="loading">Searching...</span>
        <span v-else>🔍 Search</span>
      </button>
    </form>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

interface Props {
  loading?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  loading: false,
});

const emit = defineEmits<{
  search: [query: string];
}>();

const query = ref<string>('');

const handleSubmit = (): void => {
  if (query.value.trim() && !props.loading) {
    emit('search', query.value);
  }
};
</script>

<style scoped>
.search-bar {
  max-width: 800px;
  margin: 0 auto;
}

.search-form {
  display: flex;
  gap: 10px;
  background: white;
  padding: 10px;
  border-radius: 12px;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.search-input {
  flex: 1;
  padding: 15px 20px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 1rem;
  outline: none;
  transition: border-color 0.3s;
}

.search-input:focus {
  border-color: #667eea;
}

.search-input:disabled {
  background: #f5f5f5;
  cursor: not-allowed;
}

.search-button {
  padding: 15px 30px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s;
  white-space: nowrap;
}

.search-button:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.search-button:active:not(:disabled) {
  transform: translateY(0);
}

.search-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
