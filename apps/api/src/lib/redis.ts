import { Redis } from "ioredis";

const opts = { maxRetriesPerRequest: null as null, enableReadyCheck: false };

export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, opts)
  : new Redis({
      host: process.env.REDIS_HOST || "127.0.0.1",
      port: parseInt(process.env.REDIS_PORT || "6379"),
      password: process.env.REDIS_PASSWORD,
      ...opts,
    });

redis.on("error", (err) => console.error("Redis error:", err));
