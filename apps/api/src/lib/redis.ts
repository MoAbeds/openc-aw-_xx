import Redis from "ioredis";
import { env } from "./env.js";

// Create standard Redis connection for commands / publishing
export const redis = new Redis(env.REDIS_URL as string, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

// Create separate connection for subscribing (Redis requires separate connection for Sub)
export const redisSub = new Redis(env.REDIS_URL as string, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

redis.on("error", (err) => {
    console.error("Redis connection error:", err);
});

redisSub.on("error", (err) => {
    console.error("Redis Sub connection error:", err);
});
