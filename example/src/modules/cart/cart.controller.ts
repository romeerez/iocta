import { cartModule } from "./cart.module.js";
import { validate, z } from "@morojs/moro";

export function cartController(
  { app, authMiddleware, cartService } = cartModule.injectPick({
    app: true,
    authMiddleware: ["authenticate"],
    cartService: [
      "getCart",
      "addToCart",
      "updateCartItem",
      "removeFromCart",
      "clearCart",
    ],
  }),
): void {
  app.get("/cart", async (req: any, res: any) => {
    try {
      await authMiddleware.authenticate(req, () => {});
      const cart = await cartService.getCart(req.user.id);
      return cart;
    } catch (error) {
      res.status(401);
      return { success: false, error: "Unauthorized" };
    }
  });

  app.post(
    "/cart/items",
    validate(
      {
        body: z.object({
          productId: z.string().uuid(),
          quantity: z.number().positive().max(10),
        }),
      },
      async (req, res) => {
        try {
          await authMiddleware.authenticate(req, () => {});
          const cartItem = await cartService.addToCart(
            req.user.id,
            req.body.productId,
            req.body.quantity,
          );
          return cartItem;
        } catch (error) {
          res.status(401);
          return { success: false, error: "Unauthorized" };
        }
      },
    ),
  );

  app.put(
    "/cart/items/:productId",
    validate(
      {
        params: z.object({
          productId: z.string().uuid(),
        }),
        body: z.object({
          quantity: z.number().positive().max(10),
        }),
      },
      async (req, res) => {
        try {
          await authMiddleware.authenticate(req, () => {});
          const cartItem = await cartService.updateCartItem(
            req.user.id,
            req.params.productId,
            req.body.quantity,
          );
          return cartItem;
        } catch (error) {
          res.status(401);
          return { success: false, error: "Unauthorized" };
        }
      },
    ),
  );

  app.delete(
    "/cart/items/:productId",
    validate(
      {
        params: z.object({
          productId: z.string().uuid(),
        }),
      },
      async (req, res) => {
        try {
          await authMiddleware.authenticate(req, () => {});
          await cartService.removeFromCart(req.user.id, req.params.productId);
          return { success: true };
        } catch (error) {
          res.status(401);
          return { success: false, error: "Unauthorized" };
        }
      },
    ),
  );

  app.delete("/cart", async (req: any, res: any) => {
    try {
      await authMiddleware.authenticate(req, () => {});
      await cartService.clearCart(req.user.id);
      return { success: true };
    } catch (error) {
      res.status(401);
      return { success: false, error: "Unauthorized" };
    }
  });
}
