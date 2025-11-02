import { defineModule } from "iocta";
import { initConfig } from "./config.js";

export const configModule = defineModule({
  exports: () => ({
    config: initConfig,
  }),
});
