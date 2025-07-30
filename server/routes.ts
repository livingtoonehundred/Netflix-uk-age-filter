import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get all content
  app.get("/api/content", async (req, res) => {
    try {
      const content = await storage.getAllContent();
      res.json(content);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  // Filter content by ratings, languages, genres and search query
  app.get("/api/content/filter", async (req, res) => {
    try {
      const { ratings, languages, genres, search } = req.query;
      
      let ratingsArray: string[] = [];
      if (ratings) {
        ratingsArray = Array.isArray(ratings) ? ratings as string[] : [ratings as string];
      }

      let languagesArray: string[] = [];
      if (languages) {
        languagesArray = Array.isArray(languages) ? languages as string[] : [languages as string];
      }

      let genresArray: string[] = [];
      if (genres) {
        genresArray = Array.isArray(genres) ? genres as string[] : [genres as string];
      }

      const searchQuery = search as string | undefined;
      
      // Use the storage filterContent method which handles catalog loading properly
      const filteredContent = await storage.filterContent(ratingsArray, languagesArray, genresArray, searchQuery);
      
      res.json(filteredContent);
    } catch (error) {
      console.error("Filter error:", error);
      res.status(500).json({ message: "Failed to filter content" });
    }
  });

  // Get content by specific rating
  app.get("/api/content/rating/:rating", async (req, res) => {
    try {
      const { rating } = req.params;
      const content = await storage.getContentByRating(rating);
      res.json(content);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch content by rating" });
    }
  });

  // Search content
  app.get("/api/content/search", async (req, res) => {
    try {
      const { q } = req.query;
      if (!q || typeof q !== 'string') {
        return res.status(400).json({ message: "Search query is required" });
      }
      
      const content = await storage.searchContent(q);
      res.json(content);
    } catch (error) {
      res.status(500).json({ message: "Failed to search content" });
    }
  });

  // Refresh content from OMDb API
  app.post("/api/content/refresh", async (req, res) => {
    try {
      await storage.refreshContentFromAPI();
      const content = await storage.getAllContent();
      res.json({ message: "Content refreshed successfully", count: content.length });
    } catch (error) {
      res.status(500).json({ message: "Failed to refresh content" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
