import jwt, { SignOptions, Secret } from "jsonwebtoken";

// Environment variables
const { JWT_SECRET, JWT_EXPIRES_IN = "1h" } = process.env;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

const secret: Secret = JWT_SECRET;

// TypeScript-safe: cast JWT_EXPIRES_IN as jwt.SignOptions['expiresIn']
const defaultSignOptions: SignOptions = {
  expiresIn: JWT_EXPIRES_IN as jwt.SignOptions["expiresIn"],
};

// Sign a payload into a JWT string
export const signJwt = (
  payload: Record<string, unknown>,
  options: SignOptions = defaultSignOptions,
): string => {
  return jwt.sign(payload, secret, options);
};

// Verify a JWT and return its payload typed as T
export const verifyJwt = <T = any>(token: string): T => {
  return jwt.verify(token, secret) as T;
};
