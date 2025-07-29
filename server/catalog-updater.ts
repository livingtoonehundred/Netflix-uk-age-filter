import { db } from "./db";
import { content, catalogUpdates } from "@shared/schema";
import { eq } from "drizzle-orm";

interface TMDBContent {
  id: number;
  title?: string;
  name?: string;
  release_date?: string;
  first_air_date?: string;
  overview: string;
  poster_path: string;
  genre_ids: number[];
  media_type: string;
}

export class CatalogUpdater {
  private tmdbApiKey: string;
  private lastFullUpdate: Date | null = null;
  private updateInterval: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor(tmdbApiKey: string) {
    this.tmdbApiKey = tmdbApiKey;
  }

  async scheduleUpdates() {
    // Initial full update if database is empty
    const contentCount = await db.select().from(content).limit(1);
    if (contentCount.length === 0) {
      await this.performFullUpdate();
    }

    // Schedule periodic updates
    setInterval(async () => {
      await this.performIncrementalUpdate();
    }, this.updateInterval);
  }

  async performFullUpdate(): Promise<void> {
    const updateRecord = await db.insert(catalogUpdates).values({
      updateType: 'full',
      status: 'running'
    }).returning();

    try {
      console.log("Starting full Netflix catalog update...");
      
      // Clear existing content
      await db.delete(content);
      
      const allContent = await this.fetchAllNetflixContent();
      
      // Insert content in batches
      const batchSize = 100;
      let processedCount = 0;
      
      for (let i = 0; i < allContent.length; i += batchSize) {
        const batch = allContent.slice(i, i + batchSize);
        const processedBatch = await this.processContentBatch(batch);
        
        if (processedBatch.length > 0) {
          await db.insert(content).values(processedBatch);
          processedCount += processedBatch.length;
        }

        // Update progress
        await db.update(catalogUpdates)
          .set({ titlesProcessed: processedCount })
          .where(eq(catalogUpdates.id, updateRecord[0].id));
      }

      // Mark update as completed
      await db.update(catalogUpdates)
        .set({ 
          status: 'completed',
          endTime: new Date(),
          titlesProcessed: processedCount
        })
        .where(eq(catalogUpdates.id, updateRecord[0].id));

      this.lastFullUpdate = new Date();
      console.log(`Full update completed: ${processedCount} titles processed`);
      
    } catch (error) {
      await db.update(catalogUpdates)
        .set({ 
          status: 'failed',
          endTime: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        .where(eq(catalogUpdates.id, updateRecord[0].id));
      
      console.error('Full update failed:', error);
    }
  }

  async performIncrementalUpdate(): Promise<void> {
    const updateRecord = await db.insert(catalogUpdates).values({
      updateType: 'incremental',
      status: 'running'
    }).returning();

    try {
      console.log("Starting incremental Netflix catalog update...");
      
      // Get recently updated content from TMDB (last 7 days)
      const recentContent = await this.fetchRecentNetflixContent();
      
      let processedCount = 0;
      
      for (const item of recentContent) {
        const processedItem = await this.processContentItem(item);
        if (processedItem) {
          // Upsert: update if exists, insert if new
          const existing = await db.select()
            .from(content)
            .where(eq(content.tmdbId, item.id))
            .limit(1);
          
          if (existing.length > 0) {
            await db.update(content)
              .set({ ...processedItem, lastUpdated: new Date() })
              .where(eq(content.tmdbId, item.id));
          } else {
            await db.insert(content).values(processedItem);
          }
          
          processedCount++;
        }
      }

      await db.update(catalogUpdates)
        .set({ 
          status: 'completed',
          endTime: new Date(),
          titlesProcessed: processedCount
        })
        .where(eq(catalogUpdates.id, updateRecord[0].id));

      console.log(`Incremental update completed: ${processedCount} titles processed`);
      
    } catch (error) {
      await db.update(catalogUpdates)
        .set({ 
          status: 'failed',
          endTime: new Date(),
          errorMessage: error instanceof Error ? error.message : 'Unknown error'
        })
        .where(eq(catalogUpdates.id, updateRecord[0].id));
      
      console.error('Incremental update failed:', error);
    }
  }

  private async fetchAllNetflixContent(): Promise<TMDBContent[]> {
    const allContent: TMDBContent[] = [];
    
    // Fetch movies
    for (let page = 1; page <= 500; page++) {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/discover/movie?api_key=${this.tmdbApiKey}&with_watch_providers=8&watch_region=GB&page=${page}`
        );
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          allContent.push(...data.results.map((item: any) => ({ ...item, media_type: 'movie' })));
        } else {
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error fetching movies page ${page}:`, error);
        break;
      }
    }
    
    // Fetch TV shows
    for (let page = 1; page <= 500; page++) {
      try {
        const response = await fetch(
          `https://api.themoviedb.org/3/discover/tv?api_key=${this.tmdbApiKey}&with_watch_providers=8&watch_region=GB&page=${page}`
        );
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
          allContent.push(...data.results.map((item: any) => ({ ...item, media_type: 'tv' })));
        } else {
          break;
        }
        
        await new Promise(resolve => setTimeout(resolve, 50));
      } catch (error) {
        console.error(`Error fetching TV page ${page}:`, error);
        break;
      }
    }
    
    return allContent;
  }

  private async fetchRecentNetflixContent(): Promise<TMDBContent[]> {
    // For incremental updates, fetch trending content and new releases
    const recentContent: TMDBContent[] = [];
    
    try {
      // Trending movies
      const trendingMovies = await fetch(
        `https://api.themoviedb.org/3/trending/movie/week?api_key=${this.tmdbApiKey}`
      );
      const moviesData = await trendingMovies.json();
      recentContent.push(...moviesData.results.map((item: any) => ({ ...item, media_type: 'movie' })));
      
      // Trending TV
      const trendingTV = await fetch(
        `https://api.themoviedb.org/3/trending/tv/week?api_key=${this.tmdbApiKey}`
      );
      const tvData = await trendingTV.json();
      recentContent.push(...tvData.results.map((item: any) => ({ ...item, media_type: 'tv' })));
      
    } catch (error) {
      console.error('Error fetching recent content:', error);
    }
    
    return recentContent;
  }

  private async processContentBatch(batch: TMDBContent[]): Promise<any[]> {
    const processed = [];
    
    for (const item of batch) {
      const processedItem = await this.processContentItem(item);
      if (processedItem) {
        processed.push(processedItem);
      }
    }
    
    return processed;
  }

  private async processContentItem(item: TMDBContent): Promise<any | null> {
    try {
      // Get detailed information
      const detailResponse = await fetch(
        `https://api.themoviedb.org/3/${item.media_type}/${item.id}?api_key=${this.tmdbApiKey}&append_to_response=content_ratings,release_dates`
      );
      const details = await detailResponse.json();
      
      // Extract UK rating
      let ukRating = '12';
      if (item.media_type === 'movie' && details.release_dates?.results) {
        const gbRelease = details.release_dates.results.find((r: any) => r.iso_3166_1 === 'GB');
        if (gbRelease && gbRelease.release_dates[0]?.certification) {
          ukRating = this.mapTMDBToUKRating(gbRelease.release_dates[0].certification);
        }
      } else if (item.media_type === 'tv' && details.content_ratings?.results) {
        const gbRating = details.content_ratings.results.find((r: any) => r.iso_3166_1 === 'GB');
        if (gbRating && gbRating.rating) {
          ukRating = this.mapTMDBToUKRating(gbRating.rating);
        }
      }
      
      return {
        title: details.title || details.name,
        year: (details.release_date || details.first_air_date || '').substring(0, 4) || 'Unknown',
        rating: ukRating,
        genre: details.genres?.[0]?.name || 'Drama',
        description: details.overview || 'No description available',
        imageUrl: details.poster_path ? 
          `https://image.tmdb.org/t/p/w500${details.poster_path}` : 
          `https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop`,
        type: item.media_type === 'movie' ? 'movie' : 'series',
        tmdbId: item.id,
        lastUpdated: new Date()
      };
      
    } catch (error) {
      console.error(`Error processing item ${item.id}:`, error);
      return null;
    }
  }

  private mapTMDBToUKRating(certification: string): string {
    switch (certification) {
      case 'U': return 'U';
      case 'PG': return 'PG';
      case '12A':
      case '12': return '12';
      case '15': return '15';
      case '18': 
      case 'R18': return '18';
      default: return '12';
    }
  }
}
