import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { SearchController } from './search/search.controller';
import { SearchService } from './search/search.service';
import { PubmedService } from './pubmed/pubmed.service';
import { AiService } from './ai/ai.service';

@Module({
  imports: [],
  controllers: [AppController, SearchController],
  providers: [AppService, SearchService, PubmedService, AiService],
})
export class AppModule {}
