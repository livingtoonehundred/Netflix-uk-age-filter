import { users, content, type User, type InsertUser, type Content } from "@shared/schema";

interface OMDbResponse {
  Title: string;
  Year: string;
  Rated: string;
  Genre: string;
  Plot: string;
  Poster: string;
  Type: string;
  Response: string;
}

// Map US/International ratings to UK ratings
const mapToUKRating = (usRating: string): string => {
  switch (usRating) {
    case 'G':
    case 'TV-Y':
    case 'TV-G': return 'U';
    case 'PG':
    case 'TV-PG': return 'PG';
    case 'PG-13':
    case 'TV-14': return 'PG 13';
    case 'R':
    case 'TV-MA': return '15';
    case 'NC-17':
    case 'X': return '18';
    case 'Not Rated':
    case 'Unrated': return '12';
    case 'Approved':
    case 'Passed': return 'PG';
    case 'M': return '15';
    case 'TV-Y7': return 'PG';
    default: return '12';
  }
};

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  getAllContent(): Promise<Content[]>;
  getContentByRating(rating: string): Promise<Content[]>;
  searchContent(query: string): Promise<Content[]>;
  filterContent(ratings: string[], languages?: string[], genres?: string[], searchQuery?: string): Promise<Content[]>;
  refreshContentFromAPI(): Promise<void>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private content: Map<number, Content>;
  private currentUserId: number;
  private currentContentId: number;
  private lastUpdateTime: Date;
  private updateInterval: number = 24 * 60 * 60 * 1000; // 24 hours
  private isUpdating: boolean = false;
  private catalogReady: boolean = false;

  constructor() {
    this.users = new Map();
    this.content = new Map();
    this.currentUserId = 1;
    this.currentContentId = 1;
    this.lastUpdateTime = new Date(0);
    console.log("MemStorage constructor - initializing Netflix catalog...");
    this.initializeWithScheduledUpdates();
  }

  private async initializeWithScheduledUpdates() {
    console.log("Starting Netflix catalog initialization...");
    try {
      // Initial catalog build with retry logic
      let retries = 3;
      while (retries > 0) {
        try {
          await this.refreshContentFromAPI();
          this.catalogReady = true;
          console.log(`Netflix catalog initialization complete: ${this.content.size} titles loaded`);
          break;
        } catch (error) {
          retries--;
          console.error(`Failed to initialize Netflix catalog (${retries} retries left):`, error);
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds before retry
          }
        }
      }
    } catch (error) {
      console.error("Failed to initialize Netflix catalog after all retries:", error);
    }
    
    // Schedule daily updates to keep catalog current
    setInterval(async () => {
      if (!this.isUpdating && this.catalogReady) {
        console.log("Performing scheduled daily Netflix catalog update...");
        try {
          await this.refreshContentFromAPI();
        } catch (error) {
          console.error("Failed to update Netflix catalog:", error);
        }
      }
    }, this.updateInterval);
  }

  async refreshContentFromAPI(): Promise<void> {
    if (this.isUpdating) {
      console.log("Update already in progress, skipping...");
      return;
    }

    this.isUpdating = true;
    this.content.clear();
    this.currentContentId = 1;

    // Use TMDB API for authentic Netflix catalog
    const tmdbApiKey = process.env.TMDB_API_KEY || "98a68fc1c8e711ef209c4bffb074eecb";
    
    console.log("Updating Netflix catalog with fresh TMDB data...");
    await this.buildNetflixCatalogFromTMDB(tmdbApiKey);
    
    this.lastUpdateTime = new Date();
    this.isUpdating = false;
  }

  private async buildNetflixCatalogFromTMDB(apiKey: string): Promise<void> {
    try {
      console.log("Starting Netflix catalog build with API key:", apiKey ? "Present" : "Missing");
      let allNetflixContent: any[] = [];
      
      // Fetch Netflix movies
      console.log("Fetching Netflix movies from TMDB...");
      for (let page = 1; page <= 300; page++) {
        try {
          const response = await fetch(
            `https://api.themoviedb.org/3/discover/movie?api_key=${apiKey}&with_watch_providers=8&watch_region=GB&page=${page}&sort_by=popularity.desc`
          );
          
          if (!response.ok) {
            console.error(`TMDB API error: ${response.status} ${response.statusText}`);
            break;
          }
          
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            allNetflixContent.push(...data.results.map((item: any) => ({ ...item, media_type: 'movie' })));
          } else {
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 20)); // Faster API calls
        } catch (error) {
          console.error(`Error fetching movies page ${page}:`, error);
          break;
        }
      }
      
      // Fetch Netflix TV shows
      console.log("Fetching Netflix TV shows from TMDB...");
      const tvStartCount = allNetflixContent.length;
      for (let page = 1; page <= 300; page++) {
        try {
          const response = await fetch(
            `https://api.themoviedb.org/3/discover/tv?api_key=${apiKey}&with_watch_providers=8&watch_region=GB&page=${page}&sort_by=popularity.desc`
          );
          const data = await response.json();
          
          if (data.results && data.results.length > 0) {
            allNetflixContent.push(...data.results.map((item: any) => ({ ...item, media_type: 'tv' })));
          } else {
            break;
          }
          
          await new Promise(resolve => setTimeout(resolve, 20)); // Faster API calls
        } catch (error) {
          console.error(`Error fetching TV page ${page}:`, error);
          break;
        }
      }
      
      console.log(`TMDB discovery complete! Found ${allNetflixContent.length} Netflix titles. Processing detailed metadata...`);
      
      // Process each title with detailed information - PERFORMANCE OPTIMIZED
      let processedCount = 0;
      const batchSize = 50; // Increased batch size for faster processing
      
      for (let i = 0; i < allNetflixContent.length; i += batchSize) {
        const batch = allNetflixContent.slice(i, i + batchSize);
        
        const promises = batch.map(async (item) => {
          try {
            const mediaType = item.media_type;
            const detailResponse = await fetch(
              `https://api.themoviedb.org/3/${mediaType}/${item.id}?api_key=${apiKey}&append_to_response=content_ratings,release_dates`
            );
            const details = await detailResponse.json();
            
            // Extract UK rating
            let ukRating = '12';
            if (mediaType === 'movie' && details.release_dates?.results) {
              const gbRelease = details.release_dates.results.find((r: any) => r.iso_3166_1 === 'GB');
              if (gbRelease && gbRelease.release_dates[0]?.certification) {
                ukRating = this.mapTMDBToUKRating(gbRelease.release_dates[0].certification);
              }
            } else if (mediaType === 'tv' && details.content_ratings?.results) {
              const gbRating = details.content_ratings.results.find((r: any) => r.iso_3166_1 === 'GB');
              if (gbRating && gbRating.rating) {
                ukRating = this.mapTMDBToUKRating(gbRating.rating);
              }
            }
            
            // Map language code to readable language name
            const languageMap: { [key: string]: string } = {
              'en': 'English',
              'es': 'Spanish',
              'fr': 'French',
              'de': 'German',
              'it': 'Italian',
              'ja': 'Japanese',
              'ko': 'Korean',
              'zh': 'Chinese',
              'hi': 'Hindi',
              'pt': 'Portuguese',
              'ru': 'Russian',
              'ar': 'Arabic',
              'th': 'Thai',
              'tr': 'Turkish',
              'nl': 'Dutch',
              'sv': 'Swedish',
              'da': 'Danish',
              'no': 'Norwegian',
              'fi': 'Finnish',
              'pl': 'Polish',
              'cs': 'Czech',
              'hu': 'Hungarian',
              'ro': 'Romanian',
              'bg': 'Bulgarian',
              'hr': 'Croatian',
              'sr': 'Serbian',
              'sk': 'Slovak',
              'sl': 'Slovenian',
              'et': 'Estonian',
              'lv': 'Latvian',
              'lt': 'Lithuanian',
              'mt': 'Maltese',
              'ga': 'Irish'
            };
            
            const originalLanguage = languageMap[details.original_language] || 'Other';

            const content: Content = {
              id: this.currentContentId++,
              title: details.title || details.name,
              year: (details.release_date || details.first_air_date || '').substring(0, 4) || 'Unknown',
              rating: ukRating,
              genre: details.genres?.[0]?.name || 'Drama',
              description: details.overview || 'No description available',
              imageUrl: details.poster_path ? 
                `https://image.tmdb.org/t/p/w500${details.poster_path}` : 
                `https://images.unsplash.com/photo-1440404653325-ab127d49abc1?w=400&h=600&fit=crop`,
              type: mediaType === 'movie' ? 'movie' : 'series',
              language: originalLanguage,
              tmdbId: item.id,
              lastUpdated: new Date()
            };
            
            this.content.set(content.id, content);
            processedCount++;
            
            // Reduced delay for faster processing
            await new Promise(resolve => setTimeout(resolve, 10));
          } catch (error) {
            console.error(`Error processing ${item.title || item.name}:`, error);
          }
        });
        
        await Promise.all(promises);
        
        // PERFORMANCE FIX: Allow API responses even while processing
        if (i % (batchSize * 2) === 0) {
          console.log(`Processed ${Math.min(i + batchSize, allNetflixContent.length)}/${allNetflixContent.length} titles. Added ${processedCount} to catalog...`);
          // Set catalog as ready after first 1000 titles for faster UX
          if (!this.catalogReady && this.content.size >= 1000) {
            this.catalogReady = true;
            console.log("Catalog now available for filtering with partial content");
          }
        }
      }
      
      console.log(`Netflix catalog update complete: ${this.content.size} authentic titles with UK ratings (Last updated: ${this.lastUpdateTime.toISOString()})`);
      
    } catch (error) {
      console.error('TMDB API error:', error);
      this.isUpdating = false;
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

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    for (const [_, user] of this.users) {
      if (user.username === username) {
        return user;
      }
    }
    return undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);
    return user;
  }

  async getAllContent(): Promise<Content[]> {
    return Array.from(this.content.values()).sort((a, b) => a.title.localeCompare(b.title));
  }

  async getContentByRating(rating: string): Promise<Content[]> {
    return Array.from(this.content.values())
      .filter(item => item.rating === rating)
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async searchContent(query: string): Promise<Content[]> {
    const lowercaseQuery = query.toLowerCase();
    return Array.from(this.content.values())
      .filter(item => 
        item.title.toLowerCase().includes(lowercaseQuery) ||
        item.genre.toLowerCase().includes(lowercaseQuery) ||
        item.description.toLowerCase().includes(lowercaseQuery)
      )
      .sort((a, b) => a.title.localeCompare(b.title));
  }

  async filterContent(ratings: string[], languages?: string[], genres?: string[], searchQuery?: string): Promise<Content[]> {
    // PERFORMANCE FIX: Return partial results immediately while catalog loads
    if (!this.catalogReady && this.content.size < 500) {
      console.log(`Catalog still loading (${this.content.size} titles), returning available content`);
      // Return what we have so far to improve perceived speed
    }
    
    let filteredContent = Array.from(this.content.values());

    // IMPORTANT: If no filters are applied at all, show the entire catalog
    const hasFilters = ratings.length > 0 || (languages && languages.length > 0) || (genres && genres.length > 0) || (searchQuery && searchQuery.trim());
    
    if (!hasFilters) {
      // Show entire catalog when no filters are selected
      console.log(`No filters applied, showing entire catalog (${filteredContent.length} titles)`);
      return filteredContent.sort((a, b) => a.title.localeCompare(b.title));
    }

    // Filter by ratings - if no ratings selected, show all content
    if (ratings.length > 0) {
      filteredContent = filteredContent.filter(
        item => ratings.includes(item.rating)
      );
    }

    // Filter by languages - if no languages selected, show all content
    if (languages && languages.length > 0) {
      filteredContent = filteredContent.filter(
        item => languages.includes(item.language)
      );
    }

    // Filter by genres - if no genres selected, show all content
    if (genres && genres.length > 0) {
      filteredContent = filteredContent.filter(
        item => genres.includes(item.genre)
      );
    }

    // Filter by search query
    if (searchQuery && searchQuery.trim()) {
      const lowercaseQuery = searchQuery.toLowerCase().trim();
      filteredContent = filteredContent.filter(
        item => 
          item.title.toLowerCase().includes(lowercaseQuery) ||
          item.genre.toLowerCase().includes(lowercaseQuery) ||
          item.description.toLowerCase().includes(lowercaseQuery)
      );
    }

    console.log(`Applied filters returned ${filteredContent.length} titles`);
    return filteredContent.sort((a, b) => a.title.localeCompare(b.title));
  }
}

export const storage = new MemStorage();
