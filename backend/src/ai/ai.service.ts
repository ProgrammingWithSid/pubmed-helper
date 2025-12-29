import { Injectable } from '@nestjs/common';
import axios from 'axios';

@Injectable()
export class AiService {
  private readonly apiKey: string;
  private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';

  constructor() {
    // Get API key from environment variable
    // Supports both direct env vars and .env file (if dotenv is installed)
    this.apiKey = process.env.OPENAI_API_KEY || '';
  }

  async generateSummary(title: string, abstract: string): Promise<string> {
    // If no API key is provided, return a fallback summary
    if (!this.apiKey) {
      return this.generateFallbackSummary(abstract);
    }

    try {
      const prompt = `Please provide a very brief summary (2-3 sentences maximum) of this scientific article:

Title: ${title}

Abstract: ${abstract.substring(0, 1500)}

Provide only the summary, no additional text.`;

      const response = await axios.post(
        this.apiUrl,
        {
          model: 'gpt-5.1',
          messages: [
            {
              role: 'system',
              content: 'You are a helpful assistant that provides concise summaries of scientific articles.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: 150,
          temperature: 0.7,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const summary = response.data.choices[0]?.message?.content?.trim();
      return summary || this.generateFallbackSummary(abstract);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('Error generating AI summary:', errorMessage);
      // Fallback to simple summary if API fails
      return this.generateFallbackSummary(abstract);
    }
  }

  private generateFallbackSummary(abstract: string): string {
    // Extract first 2-3 sentences as a fallback summary
    const sentences = abstract.split(/[.!?]+/).filter(s => s.trim().length > 20);
    const summary = sentences.slice(0, 3).join('. ').trim();
    return summary ? `${summary}.` : abstract.substring(0, 200) + '...';
  }
}
