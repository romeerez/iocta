import { paymentModule } from "./payment.module.js";
import { validate, z } from "@morojs/moro";

export function paymentController(
  { app, paymentService } = paymentModule.injectPick({
    app: true,
    paymentService: ["handleWebhook"],
  }),
): void {
  app.post(
    "/webhooks/stripe",
    validate(
      {
        body: z.any(), // Raw body needed for Stripe signature verification
      },
      async (req, res) => {
        await paymentService.handleWebhook(
          req.body,
          req.headers["stripe-signature"],
        );
        return { received: true };
      },
    ),
  );
}
