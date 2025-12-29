import { BadRequestException, Controller, Get, Query } from '@nestjs/common';
import { ArticleSummary } from '../pubmed/pubmed.service';
import { SearchService } from './search.service';

export interface PaginatedResponse {
  articles: ArticleSummary[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

@Controller('search')
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  async search(
    @Query('q') query: string,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
    @Query('fromYear') fromYear?: string,
    @Query('toYear') toYear?: string,
    @Query('articleType') articleType?: string,
    @Query('journal') journal?: string,
    @Query('language') language?: string,
    @Query('fullText') fullText?: string,
    @Query('sort') sort?: string,
  ): Promise<PaginatedResponse> {
    if (!query || query.trim().length === 0) {
      throw new BadRequestException('Query parameter "q" is required');
    }

    const pageNum = page ? parseInt(page, 10) : 1;
    const size = pageSize ? parseInt(pageSize, 10) : 10;

    if (isNaN(pageNum) || pageNum < 1) {
      throw new BadRequestException('Page must be a number greater than 0');
    }

    if (isNaN(size) || size < 1 || size > 50) {
      throw new BadRequestException('Page size must be a number between 1 and 50');
    }

    // Validate filters
    const filters = {
      fromYear: fromYear ? parseInt(fromYear, 10) : undefined,
      toYear: toYear ? parseInt(toYear, 10) : undefined,
      articleType: articleType || undefined,
      journal: journal || undefined,
      language: language || undefined,
      fullText: fullText === 'true' || fullText === '1',
      sort: sort || 'relevance',
    };

    if (filters.fromYear && (isNaN(filters.fromYear) || filters.fromYear < 1800 || filters.fromYear > new Date().getFullYear())) {
      throw new BadRequestException('Invalid fromYear');
    }

    if (filters.toYear && (isNaN(filters.toYear) || filters.toYear < 1800 || filters.toYear > new Date().getFullYear())) {
      throw new BadRequestException('Invalid toYear');
    }

    if (filters.fromYear && filters.toYear && filters.fromYear > filters.toYear) {
      throw new BadRequestException('fromYear must be less than or equal to toYear');
    }

    const validSortOptions = ['relevance', 'date', 'pub_date'];
    if (filters.sort && !validSortOptions.includes(filters.sort)) {
      throw new BadRequestException(`Sort must be one of: ${validSortOptions.join(', ')}`);
    }

    try {
      return await this.searchService.searchArticles(query.trim(), pageNum, size, filters);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      throw new BadRequestException(`Search failed: ${errorMessage}`);
    }
  }
}
