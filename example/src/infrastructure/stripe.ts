import Stripe from "stripe";
import { infraModule } from "./infra.module.js";

export const initStripe = (
  { config } = infraModule.injectPick({ config: ["stripeSecretKey"] }),
) => {
  return new Stripe(config.stripeSecretKey, {
    apiVersion: "2023-10-16",
  });
};
