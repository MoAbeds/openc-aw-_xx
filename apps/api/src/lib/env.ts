/**
 * Validated environment config via Zod.
 * Import `env` everywhere instead of process.env directly.
 */
import { z } from "zod";

const envSchema = z.object({
    NODE_ENV: z
        .enum(["development", "staging", "production"])
        .default("development"),

    // Server
    PORT: z.coerce.number().int().positive().default(3001),
    HOST: z.string().default("0.0.0.0"),

    // Auth
    JWT_SECRET: z
        .string()
        .min(32, "JWT_SECRET must be at least 32 characters"),

    // Database
    DATABASE_URL: z.string().url(),

    // Redis (optional — used by agent-runner & rate-limit store in prod)
    REDIS_URL: z.string().url().optional(),

    // CORS
    CORS_ORIGIN: z.string().default("http://localhost:3000"),
});

function parseEnv() {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
        const issues = result.error.issues
            .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
            .join("\n");
        throw new Error(`❌ Invalid environment variables:\n${issues}`);
    }
    return result.data;
}

export const env = parseEnv();
export type Env = z.infer<typeof envSchema>;
