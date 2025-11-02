import { defineModule } from "iocta";
import { infraModule } from "../../infrastructure/infra.module.js";
import { authModule } from "../auth/auth.module.js";
import { paymentService } from "./payment.service.js";
import { paymentController } from "./payment.controller.js";

export const paymentModule = defineModule({
  imports: () => ({
    ...infraModule.import("app", "stripe"),
    ...authModule.importPick({ authMiddleware: ["authenticate"] }),
  }),
  exports: () => ({
    paymentService,
  }),
  run: paymentController,
});
