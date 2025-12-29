<template>
  <div v-if="totalPages > 1 || total > 0" class="pagination">
    <button
      @click="goToPage(currentPage - 1)"
      :disabled="currentPage === 1"
      class="pagination-button"
      :class="{ disabled: currentPage === 1 }"
    >
      ← Previous
    </button>

    <div class="pagination-info">
      <span class="page-numbers">
        Page {{ currentPage }} of {{ totalPages }}
      </span>
      <span class="total-results">
        ({{ total }} total results)
      </span>
      <div class="page-size-selector">
        <label for="page-size">Results per page:</label>
        <select
          id="page-size"
          :value="pageSize"
          @change="handlePageSizeChange"
          class="page-size-select"
        >
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="20">20</option>
          <option value="50">50</option>
        </select>
      </div>
    </div>

    <button
      @click="goToPage(currentPage + 1)"
      :disabled="currentPage === totalPages"
      class="pagination-button"
      :class="{ disabled: currentPage === totalPages }"
    >
      Next →
    </button>
  </div>
</template>

<script setup lang="ts">
interface Props {
  currentPage: number;
  totalPages: number;
  total: number;
  pageSize?: number;
}

const props = withDefaults(defineProps<Props>(), {
  pageSize: 10,
});

const emit = defineEmits<{
  'page-change': [page: number];
  'page-size-change': [pageSize: number];
}>();

const goToPage = (page: number): void => {
  if (page >= 1 && page <= props.totalPages && page !== props.currentPage) {
    emit('page-change', page);
  }
};

const handlePageSizeChange = (event: Event): void => {
  const target = event.target as HTMLSelectElement;
  const newPageSize = parseInt(target.value, 10);
  emit('page-size-change', newPageSize);
};
</script>

<style scoped>
.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 20px;
  margin: 40px 0;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.pagination-button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s, box-shadow 0.2s, opacity 0.2s;
}

.pagination-button:hover:not(.disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
}

.pagination-button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: #ccc;
}

.pagination-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.page-numbers {
  font-size: 1.1rem;
  font-weight: 600;
  color: #333;
}

.total-results {
  font-size: 0.9rem;
  color: #666;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 5px;
}

.page-size-selector label {
  font-size: 0.9rem;
  color: #666;
}

.page-size-select {
  padding: 6px 12px;
  border: 2px solid #e0e0e0;
  border-radius: 6px;
  font-size: 0.9rem;
  background: white;
  color: #333;
  cursor: pointer;
  transition: border-color 0.2s;
}

.page-size-select:hover {
  border-color: #667eea;
}

.page-size-select:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

@media (max-width: 768px) {
  .pagination {
    flex-direction: column;
    gap: 15px;
  }

  .pagination-button {
    width: 100%;
    max-width: 200px;
  }
}
</style>
