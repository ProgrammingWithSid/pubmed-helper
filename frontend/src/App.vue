<template>
    <div class="app">
        <header class="header">
            <h1>🔬 PubMed Helper</h1>
            <p class="subtitle">Search for scientific articles using natural language</p>
        </header>

        <SearchBar @search="handleSearch" :loading="loading" />

        <div v-if="hasSearched" class="main-content">
            <aside class="sidebar">
                <FilterPanel :filters="currentFilters" @filter-change="handleFilterChange" />
            </aside>

            <main class="content-area">
                <div v-if="error" class="error-message">
                    {{ error }}
                </div>

                <div v-if="articles.length > 0" class="articles-container">
                    <ArticleCard v-for="article in articles" :key="article.pmid" :article="article" />
                </div>

                <Pagination
                    v-if="pagination && (pagination.totalPages > 1 || pagination.total > 0)"
                    :current-page="pagination.page"
                    :total-pages="pagination.totalPages"
                    :total="pagination.total"
                    :page-size="pagination.pageSize"
                    @page-change="handlePageChange"
                    @page-size-change="handlePageSizeChange"
                />

                <div v-if="!loading && articles.length === 0 && hasSearched" class="no-results">
                    <p>No articles found. Try a different search query.</p>
                </div>
            </main>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import ArticleCard from './components/ArticleCard.vue';
import FilterPanel from './components/FilterPanel.vue';
import Pagination from './components/Pagination.vue';
import SearchBar from './components/SearchBar.vue';
import { searchArticles, type ArticleSummary, type Pagination as PaginationType, type SearchFilters } from './services/api';

const articles = ref<ArticleSummary[]>([]);
const pagination = ref<PaginationType | null>(null);
const loading = ref<boolean>(false);
const error = ref<string | null>(null);
const hasSearched = ref<boolean>(false);
const currentQuery = ref<string>('');
const currentPage = ref<number>(1);
const currentPageSize = ref<number>(10);
const currentFilters = ref<SearchFilters>({});

const handleSearch = async (
  query: string,
  page: number = 1,
  pageSize: number = 10,
  filters: SearchFilters = {}
): Promise<void> => {
  if (!query.trim()) {
    return;
  }

  loading.value = true;
  error.value = null;
  hasSearched.value = true;
  currentQuery.value = query;
  currentPage.value = page;
  currentPageSize.value = pageSize;
  currentFilters.value = filters;

  try {
    const response = await searchArticles(query, page, pageSize, filters);
    articles.value = response.articles || [];
    pagination.value = response.pagination || null;
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : 'Failed to search articles. Please try again.';
    error.value = errorMessage;
    articles.value = [];
    pagination.value = null;
  } finally {
    loading.value = false;
  }
};

const handlePageChange = (page: number): void => {
  if (currentQuery.value) {
    handleSearch(currentQuery.value, page, currentPageSize.value, currentFilters.value);
    // Scroll to top when page changes
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const handlePageSizeChange = (pageSize: number): void => {
  if (currentQuery.value) {
    // Reset to page 1 when changing page size
    handleSearch(currentQuery.value, 1, pageSize, currentFilters.value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};

const handleFilterChange = (filters: SearchFilters): void => {
  currentFilters.value = filters;
  if (currentQuery.value) {
    // Reset to page 1 when filters change
    handleSearch(currentQuery.value, 1, currentPageSize.value, filters);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
};
</script>

<style scoped>
.app {
    min-height: 100vh;
}

.header {
    text-align: center;
    color: white;
    margin-bottom: 40px;
    padding: 20px;
}

.header h1 {
    font-size: 3rem;
    margin-bottom: 10px;
    text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.2);
}

.subtitle {
    font-size: 1.2rem;
    opacity: 0.9;
}

.main-content {
    display: flex;
    gap: 20px;
    max-width: 1400px;
    margin: 0 auto;
    padding: 0 20px;
    align-items: flex-start;
    margin-top: 30px;
}

.sidebar {
    flex: 0 0 280px;
    position: sticky;
    top: 20px;
    max-height: calc(100vh - 40px);
    overflow-y: auto;
}

.content-area {
    flex: 1;
    min-width: 0;
}

.error-message {
    background: #ff6b6b;
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    margin: 20px 0;
    text-align: center;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.articles-container {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.no-results {
    text-align: center;
    color: white;
    padding: 40px;
    font-size: 1.2rem;
    margin-top: 40px;
}

@media (max-width: 968px) {
    .main-content {
        flex-direction: column;
    }

    .sidebar {
        flex: 1;
        position: relative;
        top: 0;
        max-height: none;
        width: 100%;
    }
}
</style>
