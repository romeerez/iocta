import { v4 as uuidv4 } from "uuid";
import { productModule } from "./product.module.js";

export interface Product {
  id: string;
  name: string;
  description: string;
  price: number;
  categoryId: string;
  categoryName?: string;
  inventory: number;
  images: string[];
  active: boolean;
  createdAt: Date;
}

export interface Category {
  id: string;
  name: string;
  description?: string;
  active: boolean;
}

export interface ProductSearchQuery {
  category?: string;
  search?: string;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  page: number;
  limit: number;
  sortBy: "price" | "name" | "created_at";
  sortOrder: "asc" | "desc";
}

export interface CreateProductData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
  inventory: number;
  images?: string[];
}

export interface ProductService {
  getProductById(productId: string): Promise<Product | null>;

  getProducts(query: ProductSearchQuery): Promise<{
    products: Product[];
    total: number;
    page: number;
    totalPages: number;
  }>;

  getCategories(): Promise<Category[]>;

  createProduct(
    productData: CreateProductData,
    createdBy: string,
  ): Promise<Product>;

  updateProduct(
    productId: string,
    updates: Partial<CreateProductData & { active: boolean }>,
  ): Promise<Product>;

  checkInventory(
    productId: string,
    requestedQuantity: number,
  ): Promise<boolean>;

  updateInventory(productId: string, quantityChange: number): Promise<void>;
}

export function productService(
  { db } = productModule.inject("db"),
): ProductService {
  const self: ProductService = {
    async getProductById(productId) {
      const result = await db.query(
        `
      SELECT 
        p.id, p.name, p.description, p.price, p.category_id, c.name as category_name,
        i.quantity as inventory, p.images, p.active, p.created_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id
      WHERE p.id = $1 AND p.active = true
    `,
        [productId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      return {
        id: row.id,
        name: row.name,
        description: row.description,
        price: parseFloat(row.price),
        categoryId: row.category_id,
        categoryName: row.category_name,
        inventory: row.inventory || 0,
        images: row.images || [],
        active: row.active,
        createdAt: row.created_at,
      };
    },

    async getProducts(query) {
      const offset = (query.page - 1) * query.limit;

      let whereClause = "WHERE p.active = true";
      const queryParams: any[] = [];
      let paramIndex = 1;

      // Build WHERE clause dynamically
      if (query.category) {
        whereClause += ` AND c.name ILIKE $${paramIndex}`;
        queryParams.push(`%${query.category}%`);
        paramIndex++;
      }

      if (query.search) {
        whereClause += ` AND (p.name ILIKE $${paramIndex} OR p.description ILIKE $${paramIndex})`;
        queryParams.push(`%${query.search}%`);
        paramIndex++;
      }

      if (query.minPrice !== undefined) {
        whereClause += ` AND p.price >= $${paramIndex}`;
        queryParams.push(query.minPrice);
        paramIndex++;
      }

      if (query.maxPrice !== undefined) {
        whereClause += ` AND p.price <= $${paramIndex}`;
        queryParams.push(query.maxPrice);
        paramIndex++;
      }

      if (query.inStock) {
        whereClause += ` AND i.quantity > 0`;
      }

      // Order clause
      const orderClause = `ORDER BY p.${query.sortBy} ${query.sortOrder.toUpperCase()}`;

      // Get products
      const productsQuery = `
      SELECT 
        p.id, p.name, p.description, p.price, p.category_id, c.name as category_name,
        i.quantity as inventory, p.images, p.active, p.created_at
      FROM products p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN inventory i ON p.id = i.product_id
      ${whereClause}
      ${orderClause}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

      queryParams.push(query.limit, offset);

      const [productsResult, countResult] = await Promise.all([
        db.query(productsQuery, queryParams),
        db.query(
          `
        SELECT COUNT(*) as total
        FROM products p
        LEFT JOIN categories c ON p.category_id = c.id
        LEFT JOIN inventory i ON p.id = i.product_id
        ${whereClause}
      `,
          queryParams.slice(0, -2),
        ), // Remove limit and offset params for count
      ]);

      const products = productsResult.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        price: parseFloat(row.price),
        categoryId: row.category_id,
        categoryName: row.category_name,
        inventory: row.inventory || 0,
        images: row.images || [],
        active: row.active,
        createdAt: row.created_at,
      }));

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / query.limit);

      return {
        products,
        total,
        page: query.page,
        totalPages,
      };
    },

    async getCategories() {
      const result = await db.query(`
      SELECT id, name, description, active
      FROM categories
      WHERE active = true
      ORDER BY name
    `);

      return result.rows.map((row: any) => ({
        id: row.id,
        name: row.name,
        description: row.description,
        active: row.active,
      }));
    },

    async createProduct(productData, createdBy) {
      const productId = uuidv4();

      await db.query("BEGIN");

      try {
        // Create product
        const productResult = await db.query(
          `
        INSERT INTO products (id, name, description, price, category_id, images, active, created_at, created_by)
        VALUES ($1, $2, $3, $4, $5, $6, true, NOW(), $7)
        RETURNING *
      `,
          [
            productId,
            productData.name,
            productData.description,
            productData.price,
            productData.categoryId,
            JSON.stringify(productData.images || []),
            createdBy,
          ],
        );

        // Create inventory record
        await db.query(
          `
        INSERT INTO inventory (product_id, quantity, updated_at)
        VALUES ($1, $2, NOW())
      `,
          [productId, productData.inventory],
        );

        await db.query("COMMIT");

        // Get the complete product with category info
        const product = await self.getProductById(productId);
        return product!;
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      }
    },

    async updateProduct(productId, updates) {
      const setClauses: string[] = [];
      const values: any[] = [];
      let paramIndex = 1;

      if (updates.name !== undefined) {
        setClauses.push(`name = $${paramIndex}`);
        values.push(updates.name);
        paramIndex++;
      }

      if (updates.description !== undefined) {
        setClauses.push(`description = $${paramIndex}`);
        values.push(updates.description);
        paramIndex++;
      }

      if (updates.price !== undefined) {
        setClauses.push(`price = $${paramIndex}`);
        values.push(updates.price);
        paramIndex++;
      }

      if (updates.active !== undefined) {
        setClauses.push(`active = $${paramIndex}`);
        values.push(updates.active);
        paramIndex++;
      }

      if (setClauses.length === 0) {
        throw new Error("No updates provided");
      }

      setClauses.push(`updated_at = NOW()`);
      values.push(productId);

      await db.query(
        `
      UPDATE products 
      SET ${setClauses.join(", ")}
      WHERE id = $${paramIndex}
    `,
        values,
      );

      // Update inventory if provided
      if (updates.inventory !== undefined) {
        await db.query(
          `
        UPDATE inventory
        SET quantity = $1, updated_at = NOW()
        WHERE product_id = $2
      `,
          [updates.inventory, productId],
        );
      }

      const product = await self.getProductById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      return product;
    },

    async checkInventory(productId, requestedQuantity) {
      const result = await db.query(
        "SELECT quantity FROM inventory WHERE product_id = $1",
        [productId],
      );

      if (result.rows.length === 0) {
        return false;
      }

      return result.rows[0].quantity >= requestedQuantity;
    },

    async updateInventory(productId, quantityChange) {
      await db.query(
        `
      UPDATE inventory
      SET quantity = quantity + $1, updated_at = NOW()
      WHERE product_id = $2
    `,
        [quantityChange, productId],
      );
    },
  };

  return self;
}
