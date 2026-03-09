import argon2 from "argon2";

let cachedPepper: Promise<Buffer> | null = null;

function _getPepper(): Promise<Buffer> {
  if (cachedPepper) return cachedPepper;

  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET environment variable is not set");

  cachedPepper = crypto.subtle
    .digest("SHA-256", new TextEncoder().encode(secret))
    .then((buf) => Buffer.from(buf));

  return cachedPepper;
}

export function hash() {
  return {
    async create(value: string): Promise<string> {
      const pepper = await _getPepper();
      return argon2.hash(value, { secret: pepper });
    },
    async compare(value: string, hashedValue: string): Promise<boolean> {
      const pepper = await _getPepper();
      return argon2.verify(hashedValue, value, { secret: pepper });
    },
  };
}
