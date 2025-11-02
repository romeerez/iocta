import dotenv from "dotenv";

export interface Config {
  dbURL: string;
  jwtSecret: string;
  stripeSecretKey: string;
}

export function initConfig(): Config {
  dotenv.config();

  const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    throw new Error("STRIPE_SECRET_KEY environment variable is required");
  }

  return {
    dbURL:
      process.env.DATABASE_URL ||
      "postgresql://postgres:password@localhost:5432/ecommerce_db",
    jwtSecret: process.env.JWT_SECRET || "your-secret-key-change-in-production",
    stripeSecretKey,
  };
}
