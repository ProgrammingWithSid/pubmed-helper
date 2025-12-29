import axios, { AxiosError } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

export interface SearchFilters {
  fromYear?: number
  toYear?: number
  articleType?: string
  journal?: string
  language?: string
  sort?: string
  fullText?: boolean
}

export interface Pagination {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export interface ArticleSummary {
  pmid: string
  title: string
  authors: string[]
  abstract: string
  publicationDate: string
  journal: string
  sections?: Array<{ name: string; content: string } | string>
  aiSummary?: string
  pmcId?: string
}

export interface SearchResponse {
  articles: ArticleSummary[]
  pagination: Pagination
}

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

export const searchArticles = async (
  query: string,
  page: number = 1,
  pageSize: number = 10,
  filters: SearchFilters = {}
): Promise<SearchResponse> => {
  try {
    const params: Record<string, string | number> = {
      q: query,
      page: page,
      pageSize: pageSize,
    };

    // Add filters to params if they exist
    if (filters.fromYear !== undefined) params.fromYear = filters.fromYear;
    if (filters.toYear !== undefined) params.toYear = filters.toYear;
    if (filters.articleType) params.articleType = filters.articleType;
    if (filters.journal) params.journal = filters.journal;
    if (filters.language) params.language = filters.language;
    if (filters.sort) params.sort = filters.sort;
    if (filters.fullText) params.fullText = 'true';

    const response = await api.get<SearchResponse>('/search', { params });
    return response.data;
  } catch (error) {
    const axiosError = error as AxiosError<{ message?: string }>;
    if (axiosError.response) {
      throw new Error(
        axiosError.response.data?.message || 'Failed to search articles'
      );
    } else if (axiosError.request) {
      throw new Error(
        'Unable to connect to the server. Please make sure the backend is running.'
      );
    } else {
      throw new Error(axiosError.message || 'An unexpected error occurred');
    }
  }
}
