import { Injectable } from '@nestjs/common';
import { AiService } from '../ai/ai.service';
import { ArticleSummary, PubmedService } from '../pubmed/pubmed.service';
import { PaginatedResponse } from './search.controller';

@Injectable()
export class SearchService {
  constructor(
    private readonly pubmedService: PubmedService,
    private readonly aiService: AiService,
  ) {}

  async searchArticles(
    query: string,
    page: number = 1,
    pageSize: number = 10,
    filters?: {
      fromYear?: number;
      toYear?: number;
      articleType?: string;
      journal?: string;
      language?: string;
      fullText?: boolean;
      sort?: string;
    },
  ): Promise<PaginatedResponse> {
    try {
      const startIndex = (page - 1) * pageSize;
      // Fetch enough results to cover the current page, plus some buffer for failures
      const fetchCount = startIndex + pageSize + 10; // Fetch extra to handle failures

      // Search for articles using PubMed's E-utilities API
      // This uses the exact same search API that PubMed website uses
      // The query is processed by PubMed's search engine, so results match exactly
      const searchResult = await this.pubmedService.searchArticles(query, fetchCount, filters);

      const totalResults = searchResult.total;
      const allPmids = searchResult.pmids;

      if (allPmids.length === 0) {
        return {
          articles: [],
          pagination: {
            page,
            pageSize,
            total: 0,
            totalPages: 0,
          },
        };
      }

      // Get the PMIDs for the current page
      const pagePmids = allPmids.slice(startIndex, startIndex + pageSize);

      if (pagePmids.length === 0) {
        return {
          articles: [],
          pagination: {
            page,
            pageSize,
            total: totalResults,
            totalPages: Math.ceil(totalResults / pageSize),
          },
        };
      }

      // Fetch details for each article with throttling to avoid rate limits
      // CRITICAL: We maintain the EXACT order returned by PubMed to match PubMed's results
      // PubMed returns PMIDs in a specific order (by relevance or date), and we preserve that order
      // Process in batches of 3 with 200ms delay between batches to respect rate limits
      const articleResults = await this.fetchArticlesWithThrottling(pagePmids);

      // Preserve exact order from PubMed - only include successfully fetched articles
      // This ensures results match PubMed's display order exactly
      const articles: ArticleSummary[] = [];
      articleResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          articles.push(result.value);
        } else {
          // Log failed articles but don't include them to maintain order
          // This matches PubMed's behavior - if an article can't be fetched, it's skipped
          console.warn(`Failed to fetch article ${pagePmids[index]} (position ${startIndex + index + 1}):`, result.reason);
        }
      });

      // Log order verification
      if (articles.length > 0) {
        console.log(`Successfully fetched ${articles.length} of ${pagePmids.length} articles for page ${page}`);
        console.log(`PMID order: ${pagePmids.join(', ')}`);
        console.log(`Fetched PMIDs: ${articles.map(a => a.pmid).join(', ')}`);
      }

      if (articles.length === 0) {
        return {
          articles: [],
          pagination: {
            page,
            pageSize,
            total: totalResults,
            totalPages: Math.ceil(totalResults / pageSize),
          },
        };
      }

      // Generate AI summaries for each article
      const articlesWithSummaries = await Promise.all(
        articles.map(async (article) => {
          try {
            const aiSummary = await this.aiService.generateSummary(
              article.title,
              article.abstract,
            );
            return {
              ...article,
              aiSummary,
            };
          } catch (error) {
            console.error(`Error generating summary for ${article.pmid}:`, error);
            // Return article without AI summary if generation fails
            return article;
          }
        }),
      );

      const totalPages = Math.ceil(totalResults / pageSize);

      return {
        articles: articlesWithSummaries,
        pagination: {
          page,
          pageSize,
          total: totalResults,
          totalPages,
        },
      };
    } catch (error) {
      console.error('Error in search service:', error);
      throw error;
    }
  }

  /**
   * Fetch articles with throttling to avoid PubMed rate limits
   * Processes articles in batches with delays between batches
   */
  private async fetchArticlesWithThrottling(
    pmids: string[],
    batchSize: number = 3,
    delayMs: number = 200,
  ): Promise<PromiseSettledResult<ArticleSummary>[]> {
    const results: PromiseSettledResult<ArticleSummary>[] = [];

    // Process in batches
    for (let i = 0; i < pmids.length; i += batchSize) {
      const batch = pmids.slice(i, i + batchSize);

      // Fetch batch concurrently
      const batchResults = await Promise.allSettled(
        batch.map(pmid => this.pubmedService.getArticleDetails(pmid))
      );

      results.push(...batchResults);

      // Add delay between batches (except for the last batch)
      if (i + batchSize < pmids.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    return results;
  }
}
