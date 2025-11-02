import { productModule } from "./product.module.js";
import { validate, z } from "@morojs/moro";

export function productController(
  { app, authMiddleware, productService } = productModule.injectPick({
    app: true,
    authMiddleware: ["authenticate", "requireAdmin"],
    productService: [
      "createProduct",
      "updateProduct",
      "getProducts",
      "getProductById",
      "getCategories",
    ],
  }),
): void {
  app
    .get("/products")
    .query(
      z.object({
        category: z.string().optional(),
        search: z.string().optional(),
        minPrice: z.coerce.number().optional(),
        maxPrice: z.coerce.number().optional(),
        inStock: z.boolean().optional(),
        page: z.coerce.number().default(1),
        limit: z.coerce.number().max(50).default(20),
        sortBy: z.enum(["price", "name", "created_at"]).default("created_at"),
        sortOrder: z.enum(["asc", "desc"]).default("desc"),
      }),
    )
    .handler(async (req: any, res: any) => {
      const products = await productService.getProducts(req.query);
      return products;
    });

  app.get(
    "/products/:id",
    validate(
      {
        params: z.object({
          id: z.string().uuid(),
        }),
      },
      async (req, res) => {
        const product = await productService.getProductById(req.params.id);
        if (!product) {
          res.status(404);
          return { success: false, error: "Product not found" };
        }
        return product;
      },
    ),
  );

  app.get("/categories", () => {
    return productService.getCategories();
  });

  app.post(
    "/admin/products",
    validate(
      {
        body: z.object({
          name: z.string().min(1),
          description: z.string(),
          price: z.number().positive(),
          categoryId: z.string().uuid(),
          inventory: z.number().nonnegative(),
          images: z.array(z.string()).optional(),
        }),
      },
      async (req: any, res: any) => {
        try {
          await authMiddleware.authenticate(req, () => {});
          await authMiddleware.requireAdmin(req, () => {});
          const product = await productService.createProduct(
            req.body,
            req.user.id,
          );
          return product;
        } catch (error) {
          res.status(401);
          return { success: false, error: "Unauthorized" };
        }
      },
    ),
  );

  app.put(
    "/admin/products/:id",
    validate(
      {
        params: z.object({
          id: z.string().uuid(),
        }),
        body: z.object({
          name: z.string().min(1).optional(),
          description: z.string().optional(),
          price: z.number().positive().optional(),
          inventory: z.number().nonnegative().optional(),
          active: z.boolean().optional(),
        }),
      },
      async (req: any, res: any) => {
        try {
          await authMiddleware.authenticate(req, () => {});
          await authMiddleware.requireAdmin(req, () => {});
          const product = await productService.updateProduct(
            req.params.id,
            req.body,
          );
          return product;
        } catch (error) {
          res.status(401);
          return { success: false, error: "Unauthorized" };
        }
      },
    ),
  );
}
