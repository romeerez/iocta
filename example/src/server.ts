import { runModules } from "../../src/run.js";
import { authModule } from "./modules/auth/auth.module.js";
import { cartModule } from "./modules/cart/cart.module.js";
import { orderModule } from "./modules/order/order.module.js";
import { paymentModule } from "./modules/payment/payment.module.js";
import { productModule } from "./modules/product/product.module.js";
import { infraModule } from "./infrastructure/infra.module.js";

const {
  modules: {
    infraModule: { app },
  },
} = runModules({
  infraModule,
  authModule,
  cartModule,
  orderModule,
  paymentModule,
  productModule,
});

app.listen(() => {
  const config = app.getConfig();
  console.log(
    `🛒 E-commerce API running on http://${config.server.host}:${config.server.port}`,
  );
  console.log(
    `API endpoint: http://${config.server.host}:${config.server.port}`,
  );
  console.log(
    `Health check: http://${config.server.host}:${config.server.port}/health`,
  );
});
