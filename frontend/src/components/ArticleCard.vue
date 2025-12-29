<template>
  <div class="article-card">
    <div class="article-header">
      <h2 class="article-title">{{ article.title }}</h2>
      <div class="article-meta">
        <span class="pmid">PMID: {{ article.pmid }}</span>
        <span class="date">{{ article.publicationDate }}</span>
      </div>
      <div class="article-actions">
        <a
          :href="`https://pubmed.ncbi.nlm.nih.gov/${article.pmid}`"
          target="_blank"
          rel="noopener noreferrer"
          class="action-link"
        >
          <span class="link-icon">🔗</span>
          View on PubMed
        </a>
        <a
          v-if="article.pmcId"
          :href="`https://www.ncbi.nlm.nih.gov/pmc/articles/PMC${article.pmcId}/`"
          target="_blank"
          rel="noopener noreferrer"
          class="action-link"
        >
          <span class="link-icon">📄</span>
          View Full Text (PMC)
        </a>
      </div>
    </div>

    <div class="article-info">
      <div class="authors">
        <strong>Authors:</strong>
        <span v-if="article.authors.length > 0">
          {{ article.authors.slice(0, 5).join(', ') }}
          <span v-if="article.authors.length > 5">, et al.</span>
        </span>
        <span v-else>Not available</span>
      </div>
      <div class="journal">
        <strong>Journal:</strong> {{ article.journal }}
      </div>
    </div>

    <div v-if="article.aiSummary" class="ai-summary">
      <h3>🤖 AI Summary</h3>
      <p class="ai-summary-text">{{ article.aiSummary }}</p>
    </div>

    <div class="article-summary">
      <h3>Full Abstract</h3>
      <p class="abstract">{{ article.abstract }}</p>
    </div>

    <div v-if="article.sections && article.sections.length > 0" class="article-sections">
      <h3>📑 Article Sections</h3>
      <div class="sections-container">
        <div
          v-for="(section, index) in article.sections"
          :key="index"
          class="section-item"
        >
          <h4 class="section-title">{{ formatSectionName(section.name || section) }}</h4>
          <p class="section-content">{{ getSectionContent(section) }}</p>
        </div>
      </div>
      <p v-if="article.pmcId" class="pmc-note">
        💡 Full-text available via PMC (ID: {{ article.pmcId }})
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ArticleSummary } from '../services/api';

interface Props {
  article: ArticleSummary;
}

defineProps<Props>();

interface Section {
  name: string;
  content: string;
}

const formatSectionName = (sectionName: string | undefined): string => {
  if (!sectionName) return 'Section';
  // Convert section names to readable format
  return String(sectionName)
    .split('_')
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(' ')
    .replace(/\b\w/g, (l) => l.toUpperCase());
};

const getSectionContent = (section: Section | string): string => {
  // Handle both old format (string) and new format (object with content)
  if (typeof section === 'string') {
    return 'Content available in full abstract above.';
  }
  if (section && typeof section === 'object' && 'content' in section) {
    return section.content;
  }
  return 'Content available in full abstract above.';
};

const isPrimarySection = (section: Section | string): boolean => {
  const sectionName = typeof section === 'string' ? section : section.name;
  const primarySections = [
    'INTRODUCTION',
    'METHODS',
    'RESULTS',
    'DISCUSSION',
    'CONCLUSION',
    'BACKGROUND',
    'OBJECTIVE',
    'PURPOSE',
  ];
  return primarySections.includes(String(sectionName).toUpperCase());
};
</script>

<style scoped>
.article-card {
  background: white;
  border-radius: 12px;
  padding: 30px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s, box-shadow 0.2s;
}

.article-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
}

.article-header {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 2px solid #f0f0f0;
}

.article-title {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 10px;
  line-height: 1.4;
}

.article-meta {
  display: flex;
  gap: 15px;
  font-size: 0.9rem;
  color: #666;
  margin-bottom: 12px;
}

.pmid {
  font-weight: 600;
  color: #667eea;
}

.article-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding-top: 12px;
  margin-top: 12px;
  border-top: 1px solid #e0e0e0;
}

.action-link {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: white;
  color: #0066cc;
  text-decoration: none;
  border: 1px solid #0066cc;
  border-radius: 3px;
  font-size: 0.875rem;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.action-link:hover {
  background: #f0f7ff;
  border-color: #0052a3;
  color: #0052a3;
  text-decoration: none;
}

.action-link:active {
  background: #e0efff;
}

.link-icon {
  font-size: 0.9rem;
  line-height: 1;
}

.article-info {
  margin-bottom: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 8px;
}

.authors,
.journal {
  margin-bottom: 8px;
  font-size: 0.95rem;
  color: #555;
}

.authors:last-child,
.journal:last-child {
  margin-bottom: 0;
}

.ai-summary {
  margin-bottom: 25px;
  padding: 20px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8ecf1 100%);
  border-radius: 8px;
  border-left: 4px solid #667eea;
}

.ai-summary h3 {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 12px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.ai-summary-text {
  line-height: 1.8;
  color: #444;
  font-size: 1rem;
  font-weight: 500;
  margin: 0;
}

.article-summary {
  margin-bottom: 20px;
}

.article-summary h3 {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 2px solid #667eea;
  display: inline-block;
}

.abstract {
  line-height: 1.8;
  color: #444;
  text-align: justify;
  font-size: 1rem;
}

.article-sections {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 2px solid #f0f0f0;
}

.article-sections h3 {
  font-size: 1.2rem;
  color: #333;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
}

.sections-container {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-item {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  border-left: 4px solid #667eea;
  transition: box-shadow 0.2s;
}

.section-item:hover {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 1.1rem;
  color: #667eea;
  margin-bottom: 12px;
  font-weight: 600;
  text-transform: capitalize;
}

.section-content {
  line-height: 1.8;
  color: #444;
  font-size: 0.95rem;
  text-align: justify;
  margin: 0;
}

.pmc-note {
  font-size: 0.85rem;
  color: #667eea;
  margin-top: 20px;
  padding: 10px;
  background: #f0f4ff;
  border-radius: 6px;
  border-left: 3px solid #667eea;
}
</style>
