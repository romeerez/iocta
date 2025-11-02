import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from "uuid";
import { authModule } from "./auth.module.js";

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: "customer" | "admin";
  createdAt: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
}

export interface AuthService {
  register(userData: CreateUserData): Promise<User>;
  login(email: string, password: string): Promise<User>;
  generateToken(userId: string): string;
  verifyToken(token: string): { userId: string };
  getUserById(userId: string): Promise<User | null>;
}

export const authService = (
  { config: { jwtSecret }, db } = authModule.injectPick({
    config: ["jwtSecret"],
    db: ["query"],
  }),
): AuthService => {
  return {
    async register(userData) {
      // Check if user already exists
      const existingUser = await db.query(
        "SELECT id FROM users WHERE email = $1",
        [userData.email],
      );

      if (existingUser.rows.length > 0) {
        throw new Error("User already exists with this email");
      }

      // Hash password
      const saltRounds = 12;
      const hashedPassword = await bcrypt.hash(userData.password, saltRounds);

      // Create user
      const userId = uuidv4();
      const result = await db.query(
        `
      INSERT INTO users (id, email, first_name, last_name, password_hash, role, created_at)
      VALUES ($1, $2, $3, $4, $5, 'customer', NOW())
      RETURNING id, email, first_name, last_name, role, created_at
    `,
        [
          userId,
          userData.email,
          userData.firstName,
          userData.lastName,
          hashedPassword,
        ],
      );

      return {
        id: result.rows[0].id,
        email: result.rows[0].email,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        role: result.rows[0].role,
        createdAt: result.rows[0].created_at,
      };
    },

    async login(email, password) {
      // Get user by email
      const result = await db.query(
        "SELECT id, email, first_name, last_name, password_hash, role, created_at FROM users WHERE email = $1",
        [email],
      );

      if (result.rows.length === 0) {
        throw new Error("Invalid email or password");
      }

      const user = result.rows[0];

      // Verify password
      const isValidPassword = await bcrypt.compare(
        password,
        user.password_hash,
      );
      if (!isValidPassword) {
        throw new Error("Invalid email or password");
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        role: user.role,
        createdAt: user.created_at,
      };
    },

    generateToken(userId) {
      return jwt.sign({ userId }, jwtSecret, { expiresIn: "7d" });
    },

    verifyToken(token) {
      try {
        const decoded = jwt.verify(token, jwtSecret) as any;
        return { userId: decoded.userId };
      } catch (error) {
        throw new Error("Invalid token");
      }
    },

    async getUserById(userId) {
      const result = await db.query(
        "SELECT id, email, first_name, last_name, role, created_at FROM users WHERE id = $1",
        [userId],
      );

      if (result.rows.length === 0) {
        return null;
      }

      return {
        id: result.rows[0].id,
        email: result.rows[0].email,
        firstName: result.rows[0].first_name,
        lastName: result.rows[0].last_name,
        role: result.rows[0].role,
        createdAt: result.rows[0].created_at,
      };
    },
  };
};
