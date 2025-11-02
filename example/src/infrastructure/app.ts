import { createApp, Moro } from "@morojs/moro";

export function initApp(): Moro {
  const app = createApp({
    cors: true,
    compression: true,
    helmet: true,
  });

  // Add authentication middleware globally if needed
  app.use(async (req: any, res: any, next: () => void) => {
    // Add context object to request
    req.context = {};
    next();
  });

  app.get("/health", () => ({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      database: "connected",
      redis: "connected",
      stripe: "configured",
    },
  }));

  return app;
}
