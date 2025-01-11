import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";

interface RateLimitConfig {
  RPM?: number; 
  RPD?: number;
}

interface RateLimitResult {
  limitPerMinute?: number;
  remainingPerMinute?: number;
  resetPerMinute?: number;
  limitPerDay?: number;
  remainingPerDay?: number;
  resetPerDay?: number;
}

async function checkRateLimit(req: Request, config: RateLimitConfig): Promise<Response | RateLimitResult> {
  if (!process.env.KV_REST_API_URL || !process.env.KV_REST_API_TOKEN) {
    console.warn("KV store not configured for rate limiting");
    return {};
  }
  const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || 'unknown';
  const result: RateLimitResult = {};
  if (config.RPM) {
    const minuteRatelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(config.RPM, "1 m"),
    });
    const minuteResult = await minuteRatelimit.limit(`ratelimit_${ip}_minute`);
    result.limitPerMinute = minuteResult.limit;
    result.remainingPerMinute = minuteResult.remaining;
    result.resetPerMinute = minuteResult.reset;
    if (!minuteResult.success) {
      const resetTime = new Date(minuteResult.reset).toISOString();
      const waitTimeInSeconds = Math.ceil((minuteResult.reset - Date.now()) / 1000);
      return new Response(JSON.stringify({
        error: "Rate limit exceeded",
        details: `You have reached your request limit for the minute. Please try again in ${waitTimeInSeconds} seconds.`,
        nextAllowedTime: resetTime,
        waitTimeInSeconds: waitTimeInSeconds
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": minuteResult.limit.toString(),
          "X-RateLimit-Remaining": minuteResult.remaining.toString(),
          "X-RateLimit-Reset": minuteResult.reset.toString(),
          "Retry-After": waitTimeInSeconds.toString()
        },
      });
    }
  }
  if (config.RPD) {
    const dayRatelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(config.RPD, "1 d"),
    });
    const dayResult = await dayRatelimit.limit(`ratelimit_${ip}_day`);
    result.limitPerDay = dayResult.limit;
    result.remainingPerDay = dayResult.remaining;
    result.resetPerDay = dayResult.reset;
    if (!dayResult.success) {
      const resetTime = new Date(dayResult.reset).toISOString();
      const waitTimeInSeconds = Math.ceil((dayResult.reset - Date.now()) / 1000);
      return new Response(JSON.stringify({
        error: "Rate limit exceeded",
        details: `You have reached your request limit for the day. Please try again tomorrow.`,
        nextAllowedTime: resetTime,
        waitTimeInSeconds: waitTimeInSeconds
      }), {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "X-RateLimit-Limit": dayResult.limit.toString(),
          "X-RateLimit-Remaining": dayResult.remaining.toString(),
          "X-RateLimit-Reset": dayResult.reset.toString(),
          "Retry-After": waitTimeInSeconds.toString()
        },
      });
    }
  }
  return result;
}

export { checkRateLimit };
