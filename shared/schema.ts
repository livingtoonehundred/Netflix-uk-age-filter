import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const content = pgTable("content", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  year: text("year").notNull(),
  rating: text("rating").notNull(), // UK ratings: U, PG, 12, 15, 18
  genre: text("genre").notNull(),
  description: text("description").notNull(),
  imageUrl: text("image_url").notNull(),
  type: text("type").notNull(), // "movie" or "series"
  language: text("language").notNull(), // Original language (English, Spanish, Korean, etc.)
  tmdbId: integer("tmdb_id"),
  lastUpdated: timestamp("last_updated").defaultNow()
});

export const catalogUpdates = pgTable("catalog_updates", {
  id: serial("id").primaryKey(),
  updateType: text("update_type").notNull(), // 'full' or 'incremental'
  status: text("status").notNull(), // 'running', 'completed', 'failed'
  titlesProcessed: integer("titles_processed").default(0),
  startTime: timestamp("start_time").defaultNow(),
  endTime: timestamp("end_time"),
  errorMessage: text("error_message")
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export const insertContentSchema = createInsertSchema(content).omit({
  id: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type InsertContent = z.infer<typeof insertContentSchema>;
export type Content = typeof content.$inferSelect;
