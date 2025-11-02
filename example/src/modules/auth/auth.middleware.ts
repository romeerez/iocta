import { authModule } from "./auth.module.js";
import { HttpRequest } from "@morojs/moro";

export interface AuthMiddleware {
  authenticate(
    req: HttpRequest,
    next: () => Promise<unknown> | unknown,
  ): Promise<void>;
  requireAdmin(
    req: HttpRequest,
    next: () => Promise<unknown> | unknown,
  ): Promise<void>;
}

export function authMiddleware(
  { authService } = authModule.injectPick({
    authService: ["verifyToken", "getUserById"],
  }),
): AuthMiddleware {
  return {
    async authenticate(context, next) {
      const authHeader = context.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        throw new Error("Authentication required");
      }

      const token = authHeader.substring(7);

      try {
        const { userId } = authService.verifyToken(token);
        const user = await authService.getUserById(userId);

        if (!user) {
          throw new Error("User not found");
        }

        context.user = user;
        await next();
      } catch (error) {
        throw new Error("Invalid authentication token");
      }
    },

    async requireAdmin(context, next) {
      if (!context.user) {
        throw new Error("Authentication required");
      }

      if (context.user.role !== "admin") {
        throw new Error("Admin access required");
      }

      await next();
    },
  };
}
