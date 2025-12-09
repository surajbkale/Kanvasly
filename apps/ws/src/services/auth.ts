import jwt, { JwtPayload } from "jsonwebtoken";
import { JWT_SECRET } from "../config.js";

export function authUser(token: string) {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as JwtPayload;
    if (typeof decoded == "string") {
      console.error("Decoded token is a string, expected object");
      return null;
    }

    if (!decoded.id) {
      console.error("No valid user ID in token");
      return null;
    }
    return decoded.id;
  } catch (error) {
    console.error("JWT verification failed: ", error);
    return null;
  }
}
