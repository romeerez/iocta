import { defineModule } from "iocta";
import { initApp } from "./app.js";
import { initStripe } from "./stripe.js";
import { configModule } from "./config.module.js";
import { dbModule } from "./db.module.js";

export const infraModule = defineModule({
  imports: () => ({
    ...configModule.import("config"),
    ...dbModule.import("db"),
  }),
  exports: () => ({
    app: initApp,
    config: ({ config } = infraModule.inject("config")) => config,
    db: ({ db } = infraModule.inject("db")) => db,
    stripe: initStripe,
  }),
  run: ({ app } = infraModule.inject("app")) => {
    app.get("/health", () => ({
      status: "healthy",
      timestamp: new Date().toISOString(),
      services: {
        database: "connected",
        redis: "connected",
        stripe: "configured",
      },
    }));
  },
});
