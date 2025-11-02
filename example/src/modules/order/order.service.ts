import { v4 as uuidv4 } from "uuid";
import { orderModule } from "./order.module.js";

export interface Order {
  id: string;
  userId: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  status: "pending" | "processing" | "shipped" | "delivered" | "cancelled";
  shippingAddress: ShippingAddress;
  paymentId?: string;
  paymentStatus: "pending" | "processing" | "succeeded" | "failed";
  items: OrderItem[];
  createdAt: Date;
  updatedAt: Date;
}

export interface OrderItem {
  id: string;
  orderId: string;
  productId: string;
  productName: string;
  productPrice: number;
  quantity: number;
  subtotal: number;
}

export interface ShippingAddress {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  country: string;
}

export interface CreateOrderData {
  shippingAddress: ShippingAddress;
  paymentMethodId: string;
  couponCode?: string;
}

export interface OrderQuery {
  page: number;
  limit: number;
  status?: string;
}

export interface OrderService {
  createOrder(userId: string, orderData: CreateOrderData): Promise<Order>;
  getUserOrders(
    userId: string,
    query: OrderQuery,
  ): Promise<{
    orders: Order[];
    total: number;
    page: number;
    totalPages: number;
  }>;
  getOrder(orderId: string, userId: string): Promise<Order | null>;
  updateOrderStatus(orderId: string, status: Order["status"]): Promise<void>;
}

export function orderService(
  { db, cartService, paymentService } = orderModule.injectPick({
    db: true,
    cartService: ["getCart", "validateCartInventory", "clearCart"],
    paymentService: ["processPayment"],
  }),
): OrderService {
  return {
    async createOrder(userId, orderData) {
      const orderId = uuidv4();

      await db.query("BEGIN");

      try {
        // Get cart items
        const cart = await cartService.getCart(userId);

        if (cart.items.length === 0) {
          throw new Error("Cart is empty");
        }

        // Validate inventory
        const inventoryValidation =
          await cartService.validateCartInventory(userId);
        if (!inventoryValidation.valid) {
          throw new Error(
            `Inventory issues: ${inventoryValidation.issues.join(", ")}`,
          );
        }

        // Calculate totals
        const subtotal = cart.totalAmount;
        let discount = 0;
        let tax = 0;

        // Apply coupon if provided
        if (orderData.couponCode) {
          const couponResult = await db.query(
            `
          SELECT id, type, value, minimum_amount
          FROM coupons
          WHERE code = $1 AND active = true
            AND (expires_at IS NULL OR expires_at > NOW())
            AND (usage_limit IS NULL OR usage_count < usage_limit)
        `,
            [orderData.couponCode],
          );

          if (couponResult.rows.length > 0) {
            const coupon = couponResult.rows[0];

            if (subtotal >= (coupon.minimum_amount || 0)) {
              if (coupon.type === "percentage") {
                discount = subtotal * (coupon.value / 100);
              } else if (coupon.type === "fixed") {
                discount = Math.min(coupon.value, subtotal);
              }

              // Update coupon usage
              await db.query(
                `
              UPDATE coupons
              SET usage_count = usage_count + 1
              WHERE id = $1
            `,
                [coupon.id],
              );
            }
          }
        }

        // Calculate tax (simple 8.5% for demo)
        tax = (subtotal - discount) * 0.085;
        const total = subtotal - discount + tax;

        // Create order
        const orderResult = await db.query(
          `
        INSERT INTO orders (
          id, user_id, subtotal, discount, tax, total, status,
          shipping_address, payment_status, created_at, updated_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, 'pending', NOW(), NOW())
        RETURNING *
      `,
          [
            orderId,
            userId,
            subtotal,
            discount,
            tax,
            total,
            JSON.stringify(orderData.shippingAddress),
          ],
        );

        // Create order items
        const orderItems: OrderItem[] = [];
        for (const cartItem of cart.items) {
          const orderItemResult = await db.query(
            `
          INSERT INTO order_items (
            id, order_id, product_id, product_name, product_price, quantity, subtotal
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `,
            [
              uuidv4(),
              orderId,
              cartItem.productId,
              cartItem.productName,
              cartItem.productPrice,
              cartItem.quantity,
              cartItem.subtotal,
            ],
          );

          orderItems.push({
            id: orderItemResult.rows[0].id,
            orderId,
            productId: cartItem.productId,
            productName: cartItem.productName,
            productPrice: cartItem.productPrice,
            quantity: cartItem.quantity,
            subtotal: cartItem.subtotal,
          });

          // Update inventory
          await db.query(
            `
          UPDATE inventory
          SET quantity = quantity - $1, updated_at = NOW()
          WHERE product_id = $2
        `,
            [cartItem.quantity, cartItem.productId],
          );
        }

        // Process payment
        try {
          const paymentResult = await paymentService.processPayment({
            amount: Math.round(total * 100), // Convert to cents
            currency: "usd",
            paymentMethodId: orderData.paymentMethodId,
            orderId: orderId,
            description: `Order ${orderId}`,
          });

          // Update order with payment info
          await db.query(
            `
          UPDATE orders
          SET payment_id = $1, payment_status = $2, status = $3, updated_at = NOW()
          WHERE id = $4
        `,
            [paymentResult.paymentId, "succeeded", "processing", orderId],
          );

          // Clear cart
          await cartService.clearCart(userId);

          await db.query("COMMIT");

          const order = orderResult.rows[0];
          return {
            id: order.id,
            userId: order.user_id,
            subtotal: parseFloat(order.subtotal),
            discount: parseFloat(order.discount),
            tax: parseFloat(order.tax),
            total: parseFloat(order.total),
            status: "processing",
            shippingAddress: JSON.parse(order.shipping_address),
            paymentId: paymentResult.paymentId,
            paymentStatus: "succeeded",
            items: orderItems,
            createdAt: order.created_at,
            updatedAt: new Date(),
          };
        } catch (paymentError) {
          // Payment failed, update order status
          await db.query(
            `
          UPDATE orders
          SET payment_status = 'failed', updated_at = NOW()
          WHERE id = $1
        `,
            [orderId],
          );

          await db.query("COMMIT");
          throw new Error(
            `Payment failed: ${(paymentError as Error).message || "Unknown payment error"}`,
          );
        }
      } catch (error) {
        await db.query("ROLLBACK");
        throw error;
      }
    },

    async getUserOrders(userId, query) {
      const offset = (query.page - 1) * query.limit;

      let whereClause = "WHERE o.user_id = $1";
      const queryParams: any[] = [userId];

      if (query.status) {
        whereClause += " AND o.status = $2";
        queryParams.push(query.status);
      }

      const [ordersResult, countResult] = await Promise.all([
        db.query(
          `
        SELECT
          o.id, o.user_id, o.subtotal, o.discount, o.tax, o.total,
          o.status, o.shipping_address, o.payment_id, o.payment_status,
          o.created_at, o.updated_at
        FROM orders o
        ${whereClause}
        ORDER BY o.created_at DESC
        LIMIT $${queryParams.length + 1} OFFSET $${queryParams.length + 2}
      `,
          [...queryParams, query.limit, offset],
        ),

        db.query(
          `
        SELECT COUNT(*) as total
        FROM orders o
        ${whereClause}
      `,
          queryParams,
        ),
      ]);

      const orders: Order[] = [];

      for (const orderRow of ordersResult.rows) {
        // Get order items
        const itemsResult = await db.query(
          `
        SELECT id, order_id, product_id, product_name, product_price, quantity, subtotal
        FROM order_items
        WHERE order_id = $1
      `,
          [orderRow.id],
        );

        const items = itemsResult.rows.map((item: any) => ({
          id: item.id,
          orderId: item.order_id,
          productId: item.product_id,
          productName: item.product_name,
          productPrice: parseFloat(item.product_price),
          quantity: item.quantity,
          subtotal: parseFloat(item.subtotal),
        }));

        orders.push({
          id: orderRow.id,
          userId: orderRow.user_id,
          subtotal: parseFloat(orderRow.subtotal),
          discount: parseFloat(orderRow.discount),
          tax: parseFloat(orderRow.tax),
          total: parseFloat(orderRow.total),
          status: orderRow.status,
          shippingAddress: JSON.parse(orderRow.shipping_address),
          paymentId: orderRow.payment_id,
          paymentStatus: orderRow.payment_status,
          items,
          createdAt: orderRow.created_at,
          updatedAt: orderRow.updated_at,
        });
      }

      const total = parseInt(countResult.rows[0].total);
      const totalPages = Math.ceil(total / query.limit);

      return {
        orders,
        total,
        page: query.page,
        totalPages,
      };
    },

    async getOrder(orderId, userId) {
      const orderResult = await db.query(
        `
      SELECT
        o.id, o.user_id, o.subtotal, o.discount, o.tax, o.total,
        o.status, o.shipping_address, o.payment_id, o.payment_status,
        o.created_at, o.updated_at
      FROM orders o
      WHERE o.id = $1 AND o.user_id = $2
    `,
        [orderId, userId],
      );

      if (orderResult.rows.length === 0) {
        return null;
      }

      const order = orderResult.rows[0];

      // Get order items
      const itemsResult = await db.query(
        `
      SELECT id, order_id, product_id, product_name, product_price, quantity, subtotal
      FROM order_items
      WHERE order_id = $1
    `,
        [orderId],
      );

      const items = itemsResult.rows.map((item: any) => ({
        id: item.id,
        orderId: item.order_id,
        productId: item.product_id,
        productName: item.product_name,
        productPrice: parseFloat(item.product_price),
        quantity: item.quantity,
        subtotal: parseFloat(item.subtotal),
      }));

      return {
        id: order.id,
        userId: order.user_id,
        subtotal: parseFloat(order.subtotal),
        discount: parseFloat(order.discount),
        tax: parseFloat(order.tax),
        total: parseFloat(order.total),
        status: order.status,
        shippingAddress: JSON.parse(order.shipping_address),
        paymentId: order.payment_id,
        paymentStatus: order.payment_status,
        items,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
      };
    },

    async updateOrderStatus(orderId, status) {
      await db.query(
        `
      UPDATE orders
      SET status = $1, updated_at = NOW()
      WHERE id = $2
    `,
        [status, orderId],
      );
    },
  };
}
