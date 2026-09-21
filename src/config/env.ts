import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().int().positive(),
  NODE_ENV: z.enum(["development", "test", "production"]),

  DATABASE_URL: z.string().min(1),
});

const env = envSchema.parse(process.env);

export default env;
