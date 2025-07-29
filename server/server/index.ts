import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Load environment variables
dotenv.config();

// Ensure TMDB API key is available
if (!process.env.TMDB_API_KEY) {
  process.env.TMDB_API_KEY = "98a68fc1c8e711ef209c4bffb074eecb";
}

console.log("Environment check - TMDB API key:", process.env.TMDB_API_KEY ? "Present" : "Missing");
console.log("Node environment:", process.env.NODE_ENV);

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  
  // Deployment fallback: if static files exist, serve them; otherwise use embedded solution
  const staticPath = path.resolve(import.meta.dirname, "public");
  const hasStaticFiles = fs.existsSync(staticPath) && fs.existsSync(path.join(staticPath, "index.html"));
  
  console.log("Deployment mode check - Static files available:", hasStaticFiles);
  
  if (hasStaticFiles) {
    console.log("🚀 Serving React build from:", staticPath);
    app.use(express.static(staticPath, {
      maxAge: '1d',
      etag: true,
      setHeaders: (res, filePath) => {
        if (filePath.endsWith('.html')) {
          res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
        }
      }
    }));
    
    app.get('*', (req, res) => {
      if (!req.path.startsWith('/api/')) {
        res.sendFile(path.join(staticPath, 'index.html'));
      }
    });
    
    console.log("📱 Netflix UK Age Filter React app ready!");
  } else {
    console.log("⚠️ Static files not found, using development Vite mode");
    await setupVite(app, server);
  }

  // ALWAYS serve the app on port 5000
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = 5000;
  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);
  });
})();
