<template>
  <div class="filter-panel">
    <div class="filter-header">
      <h3>Filters</h3>
    </div>

    <div class="filter-content">
      <div class="filter-group">
        <label>Publication Date</label>
        <div class="date-range">
          <input
            v-model.number="localFilters.fromYear"
            type="number"
            placeholder="From Year"
            min="1800"
            :max="currentYear"
            class="filter-input"
          />
          <span>to</span>
          <input
            v-model.number="localFilters.toYear"
            type="number"
            placeholder="To Year"
            min="1800"
            :max="currentYear"
            class="filter-input"
          />
        </div>
      </div>

      <div class="filter-group">
        <label>Article Type</label>
        <select v-model="localFilters.articleType" class="filter-select">
          <option value="">All Types</option>
          <option value="review">Review</option>
          <option value="clinical-trial">Clinical Trial</option>
          <option value="meta-analysis">Meta-Analysis</option>
          <option value="systematic-review">Systematic Review</option>
          <option value="randomized-controlled-trial">Randomized Controlled Trial</option>
          <option value="case-report">Case Report</option>
          <option value="cohort-study">Cohort Study</option>
          <option value="case-control">Case-Control Study</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Journal</label>
        <input
          v-model="localFilters.journal"
          type="text"
          placeholder="Journal name (e.g., Nature, Science)"
          class="filter-input"
        />
      </div>

      <div class="filter-group">
        <label>Language</label>
        <select v-model="localFilters.language" class="filter-select">
          <option value="">All Languages</option>
          <option value="english">English</option>
          <option value="spanish">Spanish</option>
          <option value="french">French</option>
          <option value="german">German</option>
          <option value="chinese">Chinese</option>
          <option value="japanese">Japanese</option>
        </select>
      </div>

      <div class="filter-group">
        <label>Sort By</label>
        <select v-model="localFilters.sort" class="filter-select">
          <option value="relevance">Relevance</option>
          <option value="date">Publication Date (Newest)</option>
        </select>
      </div>

      <div class="filter-group checkbox-group">
        <label class="checkbox-label">
          <input
            v-model="localFilters.fullText"
            type="checkbox"
            class="filter-checkbox"
          />
          <span>Full-text available only (PMC)</span>
        </label>
      </div>

      <div class="filter-actions">
        <button @click="applyFilters" class="apply-button">Apply Filters</button>
        <button @click="clearFilters" class="clear-button">Clear All</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import type { SearchFilters } from '../services/api';

interface Props {
  filters?: SearchFilters
}

const props = withDefaults(defineProps<Props>(), {
  filters: () => ({}),
})

const emit = defineEmits<{
  'filter-change': [filters: SearchFilters];
}>();

const currentYear = new Date().getFullYear();

const localFilters = ref<SearchFilters>({
  fromYear: props.filters.fromYear,
  toYear: props.filters.toYear,
  articleType: props.filters.articleType || '',
  journal: props.filters.journal || '',
  language: props.filters.language || '',
  sort: props.filters.sort || 'relevance',
  fullText: props.filters.fullText || false,
});

const applyFilters = (): void => {
  const filtersToApply: SearchFilters = { ...localFilters.value };
  // Remove empty values
  Object.keys(filtersToApply).forEach((key) => {
    const value = filtersToApply[key as keyof SearchFilters];
    if (value === '' || value === null || value === false) {
      delete filtersToApply[key as keyof SearchFilters];
    }
  });
  emit('filter-change', filtersToApply);
};

const clearFilters = (): void => {
  localFilters.value = {
    articleType: '',
    journal: '',
    language: '',
    sort: 'relevance',
    fullText: false,
  };
  emit('filter-change', {});
};

// Watch for external filter changes
watch(
  () => props.filters,
  (newFilters) => {
    localFilters.value = {
      fromYear: newFilters.fromYear,
      toYear: newFilters.toYear,
      articleType: newFilters.articleType || '',
      journal: newFilters.journal || '',
      language: newFilters.language || '',
      sort: newFilters.sort || 'relevance',
      fullText: newFilters.fullText || false,
    };
  },
  { deep: true }
);
</script>

<style scoped>
.filter-panel {
  background: white;
  border: 1px solid #d0d0d0;
  border-radius: 4px;
  overflow: hidden;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.filter-header {
  background: #f5f5f5;
  border-bottom: 1px solid #d0d0d0;
  padding: 12px 15px;
}

.filter-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 600;
  color: #333;
}

.filter-content {
  padding: 15px;
}

.filter-group {
  margin-bottom: 18px;
}

.filter-group:last-child {
  margin-bottom: 0;
}

.filter-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 600;
  color: #333;
  font-size: 0.875rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.date-range {
  display: flex;
  align-items: center;
  gap: 10px;
}

.filter-input,
.filter-select {
  width: 100%;
  padding: 6px 10px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 0.875rem;
  background: white;
  transition: border-color 0.2s;
}

.filter-input:focus,
.filter-select:focus {
  outline: none;
  border-color: #0066cc;
  box-shadow: 0 0 0 2px rgba(0, 102, 204, 0.1);
}

.date-range .filter-input {
  flex: 1;
}

.date-range span {
  color: #666;
  font-weight: 500;
  font-size: 0.875rem;
}

.checkbox-group {
  margin-bottom: 15px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: normal;
  font-size: 0.875rem;
  color: #333;
}

.filter-checkbox {
  width: 16px;
  height: 16px;
  cursor: pointer;
  accent-color: #0066cc;
}

.filter-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 20px;
  padding-top: 15px;
  border-top: 1px solid #e0e0e0;
}

.apply-button,
.clear-button {
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 3px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s, border-color 0.2s;
}

.apply-button {
  background: #0066cc;
  color: white;
  border-color: #0066cc;
}

.apply-button:hover {
  background: #0052a3;
  border-color: #0052a3;
}

.clear-button {
  background: white;
  color: #333;
}

.clear-button:hover {
  background: #f5f5f5;
  border-color: #999;
}

@media (max-width: 768px) {
  .date-range {
    flex-direction: column;
    align-items: stretch;
  }

  .date-range span {
    text-align: center;
  }
}
</style>
