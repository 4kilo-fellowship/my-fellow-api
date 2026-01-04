import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "1h";

export const signJwt = (payload: object) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyJwt = <T = any>(token: string): T => {
  return jwt.verify(token, JWT_SECRET) as T;
};
