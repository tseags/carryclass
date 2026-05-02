type Bucket = {
  hits: number[];
};

const memoryStore = new Map<string, Bucket>();

export function checkRateLimit({
  key,
  limit,
  windowMs,
}: {
  key: string;
  limit: number;
  windowMs: number;
}) {
  const now = Date.now();
  const windowStart = now - windowMs;
  const bucket = memoryStore.get(key) ?? { hits: [] };
  bucket.hits = bucket.hits.filter((hit) => hit >= windowStart);

  if (bucket.hits.length >= limit) {
    const retryAfterMs = Math.max(0, windowMs - (now - bucket.hits[0]));
    memoryStore.set(key, bucket);
    return {
      allowed: false,
      retryAfterSeconds: Math.ceil(retryAfterMs / 1000),
    };
  }

  bucket.hits.push(now);
  memoryStore.set(key, bucket);

  return {
    allowed: true,
    retryAfterSeconds: 0,
  };
}
