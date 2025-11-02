import { defineModule } from "iocta";
import { infraModule } from "../../infrastructure/infra.module.js";
import { authModule } from "../auth/auth.module.js";
import { cartService } from "./cart.service.js";
import { cartController } from "./cart.controller.js";

export const cartModule = defineModule({
  imports: () => ({
    ...infraModule.import("app", "db"),
    ...authModule.importPick({ authMiddleware: ["authenticate"] }),
  }),
  exports: () => ({
    cartService,
  }),
  run: cartController,
});
