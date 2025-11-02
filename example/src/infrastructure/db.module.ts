import { defineModule } from "iocta";
import { configModule } from "./config.module.js";
import { initDb } from "./db.js";

export const dbModule = defineModule({
  imports: () => ({
    ...configModule.import("config"),
  }),
  exports: () => ({
    db: initDb,
  }),
});
