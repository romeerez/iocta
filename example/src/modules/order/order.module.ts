import { defineModule } from "iocta";
import { infraModule } from "../../infrastructure/infra.module.js";
import { authModule } from "../auth/auth.module.js";
import { orderService } from "./order.service.js";
import { orderController } from "./order.controller.js";
import { paymentModule } from "../payment/payment.module.js";
import { cartModule } from "../cart/cart.module.js";

export const orderModule = defineModule({
  imports: () => ({
    ...infraModule.import("app", "db"),
    ...authModule.importPick({ authMiddleware: ["authenticate"] }),
    ...cartModule.importPick({
      cartService: ["getCart", "validateCartInventory", "clearCart"],
    }),
    ...paymentModule.importPick({ paymentService: ["processPayment"] }),
  }),
  internal: () => ({
    orderService,
  }),
  run: orderController,
});
