import { Injectable } from '@nestjs/common';
import axios from 'axios';

export interface Section {
  name: string;
  content: string;
}

export interface ArticleSummary {
  pmid: string;
  title: string;
  authors: string[];
  abstract: string;
  publicationDate: string;
  journal: string;
  sections?: Section[];
  aiSummary?: string;
  pmcId?: string; // PubMed Central ID if available
}

@Injectable()
export class PubmedService {
  private readonly baseUrl = 'https://eutils.ncbi.nlm.nih.gov/entrez/eutils';

  async searchArticles(
    query: string,
    maxResults: number = 10,
    filters?: {
      fromYear?: number;
      toYear?: number;
      articleType?: string;
      journal?: string;
      language?: string;
      fullText?: boolean;
      sort?: string;
    },
  ): Promise<{ pmids: string[]; total: number }> {
    try {
      // Build the search query with filters
      let searchQuery = query;

      // Add publication date filter (matches PubMed's date range syntax exactly)
      if (filters?.fromYear || filters?.toYear) {
        const fromYear = filters.fromYear || 1800;
        const toYear = filters.toYear || new Date().getFullYear();
        // PubMed uses format: YYYY:YYYY[Publication Date] for date ranges
        searchQuery += ` AND (${fromYear}:${toYear}[Publication Date])`;
      }

      // Add article type filter
      if (filters?.articleType) {
        const articleTypeMap: { [key: string]: string } = {
          'review': 'Review[Publication Type]',
          'clinical-trial': 'Clinical Trial[Publication Type]',
          'meta-analysis': 'Meta-Analysis[Publication Type]',
          'systematic-review': 'Systematic Review[Publication Type]',
          'case-report': 'Case Reports[Publication Type]',
          'randomized-controlled-trial': 'Randomized Controlled Trial[Publication Type]',
          'cohort-study': 'Cohort Studies[Publication Type]',
          'case-control': 'Case-Control Studies[Publication Type]',
        };
        const pubType = articleTypeMap[filters.articleType.toLowerCase()] || filters.articleType;
        searchQuery += ` AND ${pubType}`;
      }

      // Add journal filter
      if (filters?.journal) {
        searchQuery += ` AND ${filters.journal}[Journal]`;
      }

      // Add language filter
      if (filters?.language) {
        const langMap: { [key: string]: string } = {
          'english': 'English',
          'spanish': 'Spanish',
          'french': 'French',
          'german': 'German',
          'chinese': 'Chinese',
          'japanese': 'Japanese',
        };
        const lang = langMap[filters.language.toLowerCase()] || filters.language;
        searchQuery += ` AND ${lang}[Language]`;
      }

      // Add full-text filter (PMC available)
      if (filters?.fullText) {
        searchQuery += ` AND free full text[filter]`;
      }

      // Determine sort order
      let sortOrder = filters?.sort || 'relevance';
      if (sortOrder === 'date' || sortOrder === 'pub_date') {
        sortOrder = 'pub_date';
      } else {
        sortOrder = 'relevance';
      }

      // Search PubMed using the same API that PubMed website uses
      // The query is passed directly to match PubMed's search behavior exactly
      const searchResponse = await axios.get(`${this.baseUrl}/esearch.fcgi`, {
        params: {
          db: 'pubmed',
          term: searchQuery, // Pass query with filters
          retmax: maxResults,
          retmode: 'json',
          sort: sortOrder,
          usehistory: 'n', // Don't use history, just return results
        },
        timeout: 15000, // 15 second timeout
      });

      // Validate response
      if (!searchResponse.data || !searchResponse.data.esearchresult) {
        throw new Error('Invalid response from PubMed API');
      }

      const pmids = searchResponse.data.esearchresult.idlist || [];
      const totalResults = parseInt(searchResponse.data.esearchresult.count || '0', 10);

      console.log(`PubMed search for "${query}": Found ${pmids.length} results (Total: ${totalResults})`);

      if (pmids.length === 0) {
        console.warn(`No results found for query: "${query}"`);
      }

      return { pmids, total: totalResults };
    } catch (error) {
      console.error('Error searching PubMed:', error);
      if (axios.isAxiosError(error)) {
        if (error.response) {
          throw new Error(`PubMed API error: ${error.response.status} - ${error.response.statusText}`);
        }
        if (error.code === 'ECONNABORTED') {
          throw new Error('PubMed API request timeout');
        }
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw new Error(`Failed to search PubMed: ${errorMessage}`);
    }
  }

  async getArticleDetails(pmid: string, retries: number = 2): Promise<ArticleSummary> {
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        // Fetch article details
        const fetchResponse = await axios.get(`${this.baseUrl}/efetch.fcgi`, {
          params: {
            db: 'pubmed',
            id: pmid,
            retmode: 'xml',
          },
          timeout: 10000, // 10 second timeout
        });

      const xmlData = fetchResponse.data;

      // Check if response is valid
      if (!xmlData || typeof xmlData !== 'string') {
        throw new Error(`Invalid response format for article ${pmid}`);
      }

      // Check if article exists in response
      if (xmlData.includes('<ERROR>') || xmlData.includes('Id is invalid')) {
        throw new Error(`Article ${pmid} not found or invalid`);
      }

        return await this.parseArticleXml(xmlData, pmid);
      } catch (error) {
        if (axios.isAxiosError(error)) {
          // Handle rate limiting (429) with exponential backoff retry
          if (error.response?.status === 429) {
            if (attempt < retries) {
              const backoffDelay = Math.pow(2, attempt) * 1000; // Exponential backoff: 1s, 2s, 4s
              console.warn(`Rate limited for article ${pmid}, retrying in ${backoffDelay}ms (attempt ${attempt + 1}/${retries + 1})`);
              await new Promise(resolve => setTimeout(resolve, backoffDelay));
              continue; // Retry
            }
            throw new Error(`HTTP error 429 (rate limited) for article ${pmid} after ${retries + 1} attempts`);
          }

          if (error.code === 'ECONNABORTED') {
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              continue; // Retry timeout errors
            }
            throw new Error(`Request timeout for article ${pmid}`);
          }

          if (error.response) {
            // Don't retry on 4xx errors (except 429) or 5xx errors
            if (error.response.status >= 400 && error.response.status < 500 && error.response.status !== 429) {
              throw new Error(`HTTP error ${error.response.status} for article ${pmid}`);
            }
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              continue; // Retry 5xx errors
            }
            throw new Error(`HTTP error ${error.response.status} for article ${pmid}`);
          }

          if (error.request) {
            if (attempt < retries) {
              await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)));
              continue; // Retry network errors
            }
            throw new Error(`Network error fetching article ${pmid}`);
          }
        }

        // Non-HTTP errors: don't retry
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to fetch article ${pmid}: ${errorMessage}`);
      }
    }

    // Should never reach here, but TypeScript needs it
    throw new Error(`Failed to fetch article ${pmid} after ${retries + 1} attempts`);
  }

  private async parseArticleXml(xmlData: string, pmid: string): Promise<ArticleSummary> {
    // Parse XML to extract article information
    // Try multiple patterns for title (some articles have different structures)
    let titleMatch = xmlData.match(/<ArticleTitle[^>]*>(.*?)<\/ArticleTitle>/s);
    if (!titleMatch) {
      titleMatch = xmlData.match(/<Title[^>]*>(.*?)<\/Title>/s);
    }
    const title = titleMatch ? this.cleanXmlText(titleMatch[1]) : 'No title available';

    // Try multiple patterns for abstract (some abstracts are structured differently)
    const abstractMatch = xmlData.match(/<AbstractText[^>]*>(.*?)<\/AbstractText>/s);
    let abstract = 'No abstract available';

    if (!abstractMatch) {
      // Try to match all AbstractText tags (some articles have multiple)
      const allAbstracts = xmlData.matchAll(/<AbstractText[^>]*>(.*?)<\/AbstractText>/gs);
      const abstractParts: string[] = [];
      for (const match of allAbstracts) {
        abstractParts.push(this.cleanXmlText(match[1]));
      }
      if (abstractParts.length > 0) {
        abstract = abstractParts.join(' ');
      }
    } else {
      abstract = this.cleanXmlText(abstractMatch[1]);
    }

    return await this.parseArticleWithAbstract(xmlData, pmid, title, abstract);
  }

  private async parseArticleWithAbstract(xmlData: string, pmid: string, title: string, abstract: string): Promise<ArticleSummary> {

    // Extract authors - handle different author formats
    const authors: string[] = [];
    try {
      const authorMatches = xmlData.matchAll(/<Author[^>]*>[\s\S]*?<LastName>(.*?)<\/LastName>[\s\S]*?<ForeName>(.*?)<\/ForeName>[\s\S]*?<\/Author>/g);
      for (const match of authorMatches) {
        const lastName = match[1] || '';
        const foreName = match[2] || '';
        if (lastName || foreName) {
          authors.push(`${foreName} ${lastName}`.trim());
        }
      }

      // If no authors found with ForeName, try with FirstName or just LastName
      if (authors.length === 0) {
        const simpleAuthorMatches = xmlData.matchAll(/<Author[^>]*>[\s\S]*?<LastName>(.*?)<\/LastName>[\s\S]*?<\/Author>/g);
        for (const match of simpleAuthorMatches) {
          const lastName = match[1] || '';
          if (lastName) {
            authors.push(lastName.trim());
          }
        }
      }
    } catch (error) {
      console.warn(`Could not parse authors for ${pmid}:`, error);
    }

    // Extract publication date - try multiple date formats
    let year = '';
    let month = '';
    try {
      const pubDateMatch = xmlData.match(/<PubDate>[\s\S]*?<Year>(.*?)<\/Year>/);
      year = pubDateMatch ? pubDateMatch[1] : '';
      const monthMatch = xmlData.match(/<PubDate>[\s\S]*?<Month>(.*?)<\/Month>/);
      month = monthMatch ? monthMatch[1] : '';
    } catch (error) {
      console.warn(`Could not parse date for ${pmid}:`, error);
    }
    const publicationDate = month && year ? `${month} ${year}` : year || 'Unknown date';

    // Extract journal - try multiple patterns
    let journal = 'Unknown journal';
    try {
      // Try to find journal title in different locations
      let journalMatch = xmlData.match(/<Journal>[\s\S]*?<Title>(.*?)<\/Title>/);
      if (!journalMatch) {
        journalMatch = xmlData.match(/<MedlineTA>(.*?)<\/MedlineTA>/);
      }
      if (!journalMatch) {
        journalMatch = xmlData.match(/<Title>(.*?)<\/Title>/);
      }
      if (journalMatch) {
        journal = this.cleanXmlText(journalMatch[1]);
      }
    } catch (error) {
      console.warn(`Could not parse journal for ${pmid}:`, error);
    }

    // Extract PMC ID if available (for full-text access)
    let pmcId: string | undefined;
    try {
      // Try multiple patterns to find PMC ID
      let pmcMatch = xmlData.match(/<ArticleId IdType="pmc">(.*?)<\/ArticleId>/);
      if (!pmcMatch) {
        // Try alternative format
        pmcMatch = xmlData.match(/<ArticleId IdType="pmc">PMC(\d+)<\/ArticleId>/);
      }
      if (pmcMatch) {
        // Remove "PMC" prefix if present, keep only the numeric ID
        pmcId = pmcMatch[1].replace(/^PMC/i, '').trim();
      }
    } catch (error) {
      // PMC ID not available, continue without it
      console.warn(`Could not extract PMC ID for ${pmid}:`, error);
    }

    // Extract sections with content from abstract and try to get full-text sections if available
    const sections = await this.extractSectionsWithContent(xmlData, abstract, pmcId);

    return {
      pmid,
      title,
      authors,
      abstract,
      publicationDate,
      journal,
      sections,
      pmcId,
    };
  }

  private cleanXmlText(text: string): string {
    return text
      .replace(/<[^>]+>/g, '') // Remove XML tags
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  private async extractSectionsWithContent(xmlData: string, abstract: string, pmcId?: string): Promise<Section[]> {
    const sectionsMap = new Map<string, Section>();

    // Extract sections from structured abstract (AbstractText with Label attribute)
    try {
      const structuredAbstractMatches = xmlData.matchAll(/<AbstractText[^>]*Label="([^"]+)"[^>]*>(.*?)<\/AbstractText>/gs);
      for (const match of structuredAbstractMatches) {
        const label = match[1]?.trim();
        const content = this.cleanXmlText(match[2] || '');
        if (label && content) {
          const sectionName = label.toUpperCase();
          sectionsMap.set(sectionName, {
            name: label,
            content: content,
          });
        }
      }
    } catch (error) {
      // Continue with other methods
    }

    // Extract sections from abstract text patterns (if not already extracted from structured format)
    if (sectionsMap.size === 0) {
      const sectionHeaders = [
        'BACKGROUND', 'INTRODUCTION', 'OBJECTIVE', 'OBJECTIVES', 'METHODS', 'METHODOLOGY',
        'RESULTS', 'RESULT', 'CONCLUSION', 'CONCLUSIONS', 'DISCUSSION', 'SUMMARY',
        'PURPOSE', 'AIM', 'AIMS', 'FINDINGS', 'IMPLICATIONS', 'LIMITATIONS'
      ];

      // Split abstract by section headers
      for (let i = 0; i < sectionHeaders.length; i++) {
        const header = sectionHeaders[i];
        const regex = new RegExp(`(?:^|\\n)\\s*${header}[:\\.]?\\s+`, 'i');
        const match = abstract.match(regex);

        if (match) {
          const startIndex = match.index! + match[0].length;
          // Find the next section header or end of abstract
          let endIndex = abstract.length;
          for (let j = i + 1; j < sectionHeaders.length; j++) {
            const nextHeader = sectionHeaders[j];
            const nextRegex = new RegExp(`(?:^|\\n)\\s*${nextHeader}[:\\.]?\\s+`, 'i');
            const nextMatch = abstract.substring(startIndex).match(nextRegex);
            if (nextMatch) {
              endIndex = startIndex + nextMatch.index!;
              break;
            }
          }

          const content = abstract.substring(startIndex, endIndex).trim();
          if (content.length > 20) {
            sectionsMap.set(header, {
              name: header,
              content: content,
            });
          }
        }
      }
    }

    // Try to extract sections from full-text if PMC ID is available
    if (pmcId) {
      try {
        const fullTextSections = await this.extractSectionsFromPMC(pmcId);
        fullTextSections.forEach(section => {
          if (!sectionsMap.has(section.name.toUpperCase())) {
            sectionsMap.set(section.name.toUpperCase(), section);
          }
        });
      } catch (error) {
        // If PMC fetch fails, continue with abstract sections only
        console.log(`Could not fetch full-text sections from PMC ${pmcId}`);
      }
    }

    // Extract sections from XML structure (if available in PubMed data)
    try {
      const xmlSectionMatches = xmlData.matchAll(/<sec[^>]*sec-type="([^"]+)"[^>]*>[\s\S]*?<title>(.*?)<\/title>[\s\S]*?<p>(.*?)<\/p>/gi);
      for (const match of xmlSectionMatches) {
        const sectionType = match[1]?.trim();
        const sectionTitle = this.cleanXmlText(match[2] || '');
        const sectionContent = this.cleanXmlText(match[3] || '');
        if (sectionType && sectionContent) {
          const sectionName = (sectionTitle || sectionType).toUpperCase().replace(/-/g, ' ');
          if (!sectionsMap.has(sectionName)) {
            sectionsMap.set(sectionName, {
              name: sectionTitle || sectionType,
              content: sectionContent,
            });
          }
        }
      }
    } catch (error) {
      // Continue
    }

    // If we have structured abstract sections, use them
    // Otherwise, split abstract into logical sections
    if (sectionsMap.size === 0) {
      // Try to split abstract by common section headers
      const abstractSections = this.splitAbstractIntoSections(abstract);
      abstractSections.forEach(section => {
        sectionsMap.set(section.name.toUpperCase(), section);
      });
    }

    // Always include the full abstract as a section if we have other sections
    if (sectionsMap.size > 0 && abstract && abstract !== 'No abstract available') {
      sectionsMap.set('ABSTRACT', {
        name: 'Abstract',
        content: abstract,
      });
    }

    // Convert Map to Array and sort
    const sectionsArray = Array.from(sectionsMap.values());

    // Sort sections in typical article order
    const sectionOrder = [
      'ABSTRACT',
      'BACKGROUND', 'INTRODUCTION', 'OBJECTIVE', 'OBJECTIVES', 'PURPOSE', 'AIM', 'AIMS',
      'METHODS', 'METHODOLOGY', 'STUDY DESIGN', 'STUDY POPULATION', 'DATA SOURCES', 'STATISTICAL ANALYSIS',
      'RESULTS', 'RESULT', 'KEY RESULTS', 'FINDINGS',
      'DISCUSSION', 'CONCLUSION', 'CONCLUSIONS', 'INTERPRETATION', 'IMPLICATIONS', 'LIMITATIONS',
      'SUMMARY'
    ];

    const sortedSections = sectionsArray.sort((a, b) => {
      const indexA = sectionOrder.indexOf(a.name.toUpperCase());
      const indexB = sectionOrder.indexOf(b.name.toUpperCase());
      if (indexA === -1 && indexB === -1) return a.name.localeCompare(b.name);
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });

    return sortedSections.length > 0 ? sortedSections : [{
      name: 'Abstract',
      content: abstract || 'No abstract available',
    }];
  }

  private splitAbstractIntoSections(abstract: string): Section[] {
    const sections: Section[] = [];
    const sectionHeaders = [
      'BACKGROUND', 'INTRODUCTION', 'OBJECTIVE', 'OBJECTIVES', 'METHODS', 'METHODOLOGY',
      'RESULTS', 'RESULT', 'CONCLUSION', 'CONCLUSIONS', 'DISCUSSION', 'SUMMARY',
      'PURPOSE', 'AIM', 'AIMS', 'FINDINGS', 'IMPLICATIONS', 'LIMITATIONS'
    ];

    // Try to find section headers in the abstract
    const parts: Array<{ header: string; content: string }> = [];

    for (const header of sectionHeaders) {
      const regex = new RegExp(`(?:^|\\n)\\s*${header}[:\\s]\\s*(.*?)(?=\\n\\s*(?:${sectionHeaders.join('|')})[:\\s]|$)`, 'gis');
      const match = regex.exec(abstract);
      if (match) {
        const content = match[1]?.trim() || '';
        if (content.length > 20) {
          parts.push({ header, content });
        }
      }
    }

    // If we found structured parts, create sections
    if (parts.length > 0) {
      parts.forEach(part => {
        sections.push({
          name: part.header,
          content: part.content,
        });
      });
    }

    return sections;
  }

  private async extractSectionsFromPMC(pmcId: string): Promise<Section[]> {
    const sections: Section[] = [];
    try {
      // Fetch full-text XML from PMC
      const pmcResponse = await axios.get(`https://www.ncbi.nlm.nih.gov/pmc/utils/oa/oa.fcgi`, {
        params: {
          id: `PMC${pmcId}`,
          format: 'xml',
        },
        timeout: 10000,
      });

      const pmcXml = pmcResponse.data;
      if (typeof pmcXml === 'string') {
        // Extract sections with titles and content from PMC XML
        // Match sections with their titles and paragraph content
        const sectionMatches = pmcXml.matchAll(/<sec[^>]*>[\s\S]*?<title>(.*?)<\/title>([\s\S]*?)<\/sec>/gi);
        for (const match of sectionMatches) {
          const sectionTitle = this.cleanXmlText(match[1] || '');
          const sectionContent = this.cleanXmlText(match[2] || '');

          if (sectionTitle && sectionContent && sectionContent.length > 50) {
            sections.push({
              name: sectionTitle,
              content: sectionContent.substring(0, 2000), // Limit content length
            });
          }
        }

        // Also try to extract paragraphs from common sections
        const commonSections = [
          'INTRODUCTION', 'METHODS', 'RESULTS', 'DISCUSSION', 'CONCLUSION',
          'BACKGROUND', 'OBJECTIVE', 'MATERIALS AND METHODS', 'FINDINGS'
        ];

        for (const sectionName of commonSections) {
          const sectionRegex = new RegExp(`<sec[^>]*>[\s\S]*?<title>${sectionName}[^<]*<\/title>([\s\S]*?)<\/sec>`, 'gi');
          const sectionMatch = sectionRegex.exec(pmcXml);
          if (sectionMatch) {
            const content = this.cleanXmlText(sectionMatch[1] || '');
            if (content && content.length > 50) {
              // Check if we already have this section
              const exists = sections.some(s => s.name.toUpperCase() === sectionName.toUpperCase());
              if (!exists) {
                sections.push({
                  name: sectionName,
                  content: content.substring(0, 2000),
                });
              }
            }
          }
        }
      }
    } catch (error) {
      // Return empty array if PMC fetch fails
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.log(`Could not extract sections from PMC ${pmcId}:`, errorMessage);
    }
    return sections;
  }
}
