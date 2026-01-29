import jwt, { SignOptions, Secret } from "jsonwebtoken";

const { JWT_SECRET, JWT_EXPIRES_IN = "1h" } = process.env;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

const secret: Secret = JWT_SECRET;

const defaultSignOptions: SignOptions = {
  expiresIn: JWT_EXPIRES_IN as SignOptions["expiresIn"],
};

export const signJwt = (
  payload: Record<string, unknown>,
  options: SignOptions = defaultSignOptions,
): string => {
  return jwt.sign(payload, secret, options);
};

export const verifyJwt = <T = any>(token: string): T => {
  return jwt.verify(token, secret) as T;
};
