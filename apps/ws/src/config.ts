import dotenv from "dotenv";
dotenv.config();

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is ABSOLUTELY REQUIRED and not set");
}

export const JWT_SECRET = process.env.JWT_SECRET;
export const PORT = Number(process.env.PORT) || 8080;
