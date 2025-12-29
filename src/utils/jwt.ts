import jwt, { type Secret } from "jsonwebtoken";
import ms, { type StringValue } from "ms";
import { PLATFORM_ROLES } from "../constants/roles";

type JwtPayload = {
  userId: string;
  platformRole: (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];
};

const accessSecret: Secret = process.env.JWT_ACCESS_SECRET as string;
const refreshSecret: Secret = process.env.JWT_REFRESH_SECRET as string;

export function signAccessToken(payload: JwtPayload) {
  const ttl = (process.env.ACCESS_TOKEN_TTL || "15m") as StringValue;
  return jwt.sign(payload, accessSecret, { expiresIn: ttl });
}

export function signRefreshToken(payload: JwtPayload) {
  const ttl = (process.env.REFRESH_TOKEN_TTL || "30d") as StringValue;
  return jwt.sign(payload, refreshSecret, { expiresIn: ttl });
}

export function verifyAccessToken(token: string) {
  return jwt.verify(token, accessSecret) as JwtPayload;
}

export function verifyRefreshToken(token: string) {
  return jwt.verify(token, refreshSecret) as JwtPayload;
}

export function refreshExpiryDate() {
  const ttl = (process.env.REFRESH_TOKEN_TTL || "30d") as StringValue;
  return new Date(Date.now() + ms(ttl));
}
