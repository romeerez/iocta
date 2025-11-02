import { validate, z } from "@morojs/moro";
import { authModule } from "./auth.module.js";

export function authController(
  { app, authService } = authModule.injectPick({
    app: true,
    authService: ["register", "login", "generateToken"],
  }),
): void {
  app.post(
    "/auth/register",
    validate(
      {
        body: z.object({
          email: z.string().email(),
          password: z.string().min(6),
          firstName: z.string().min(1),
          lastName: z.string().min(1),
        }),
      },
      async (req, res) => {
        const user = await authService.register(req.body);
        return { user, token: authService.generateToken(user.id) };
      },
    ),
  );

  app.post(
    "/auth/login",
    validate(
      {
        body: z.object({
          email: z.string().email(),
          password: z.string(),
        }),
      },
      async (req, res) => {
        const user = await authService.login(req.body.email, req.body.password);
        return { user, token: authService.generateToken(user.id) };
      },
    ),
  );
}
