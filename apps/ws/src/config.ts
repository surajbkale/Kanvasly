import dotenv from "dotenv";
dotenv.config();

import { JWT_SECRET as JWT_SECRET_TYPE } from "@repo/common/types";

export const PORT = Number(process.env.PORT) || 8080;
export const JWT_SECRET = process.env.JWT_SECRET || (JWT_SECRET_TYPE as string);
