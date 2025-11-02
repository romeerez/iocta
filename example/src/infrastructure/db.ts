import { infraModule } from "./infra.module.js";
import { Pool } from "pg";

export function initDb(
  { config } = infraModule.injectPick({ config: ["dbURL"] }),
): Pool {
  return new Pool({ connectionString: config.dbURL });
}
