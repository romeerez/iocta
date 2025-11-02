import { orderModule } from "./order.module.js";
import { validate, z } from "@morojs/moro";
import { OrderQuery } from "./order.service.js";

export function orderController(
  { app, authMiddleware, orderService } = orderModule.injectPick({
    app: true,
    authMiddleware: ["authenticate"],
    orderService: ["createOrder", "getOrder", "getUserOrders"],
  }),
): void {
  app.post(
    "/checkout",
    validate(
      {
        body: z.object({
          shippingAddress: z.object({
            street: z.string(),
            city: z.string(),
            state: z.string(),
            zipCode: z.string(),
            country: z.string().default("US"),
          }),
          paymentMethodId: z.string(), // Stripe Payment Method ID
          couponCode: z.string().optional(),
        }),
      },
      async (req, res) => {
        try {
          await authMiddleware.authenticate(req, () => {});
          const order = await orderService.createOrder(req.user.id, req.body);
          return order;
        } catch (error) {
          res.status(401);
          return { success: false, error: "Unauthorized" };
        }
      },
    ),
  );

  app
    .get("/orders")
    .query(
      z.object({
        page: z.coerce.number().default(1),
        limit: z.coerce.number().max(50).default(10),
        status: z
          .enum(["pending", "processing", "shipped", "delivered", "cancelled"])
          .optional(),
      }),
    )
    .handler(async (req: any, res: any) => {
      try {
        await authMiddleware.authenticate(req, () => {});
        const orders = await orderService.getUserOrders(
          req.user.id,
          req.query as unknown as OrderQuery,
        );
        return orders;
      } catch (error) {
        res.status(401);
        return { success: false, error: "Unauthorized" };
      }
    });

  app.get(
    "/orders/:id",
    validate(
      {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
      async (req, res) => {
        try {
          await authMiddleware.authenticate(req, () => {});
          const order = await orderService.getOrder(req.params.id, req.user.id);
          return order;
        } catch (error) {
          res.status(401);
          return { success: false, error: "Unauthorized" };
        }
      },
    ),
  );
}
