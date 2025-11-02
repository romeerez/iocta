import { defineModule } from "iocta";
import { infraModule } from "../../infrastructure/infra.module.js";
import { authService } from "./auth.service.js";
import { authMiddleware } from "./auth.middleware.js";
import { authController } from "./auth.controller.js";

export const authModule = defineModule({
  imports: () => ({
    ...infraModule.importPick({
      app: true,
      config: ["jwtSecret"],
      db: true,
    }),
  }),
  internal: () => ({
    authService,
  }),
  exports: () => ({
    authMiddleware,
  }),
  run: authController,
});
