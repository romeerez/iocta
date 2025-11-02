import { rakeDb } from "rake-db/node-postgres";
import { runModules } from "../../../../src/run.js";
import { configModule } from "../config.module.js";

const {
  modules: {
    configModule: { config },
  },
} = runModules({ configModule });

export const change = rakeDb(
  { databaseURL: config.dbURL },
  {
    migrationsPath: "./migrations",
    commands: {
      async seed() {
        const { seed } = await import("./seed.js");
        await seed();
      },
    },
    import: (path: string) => import(path),
  },
);
