import { defineModule } from "iocta";
import { infraModule } from "../../infrastructure/infra.module.js";
import { authModule } from "../auth/auth.module.js";
import { productService } from "./product.service.js";
import { productController } from "./product.controller.js";

export const productModule = defineModule({
  imports: () => ({
    ...infraModule.import("app", "db"),
    ...authModule.importPick({
      authMiddleware: ["authenticate", "requireAdmin"],
    }),
  }),
  internal: () => ({
    productService,
  }),
  run: productController,
});
