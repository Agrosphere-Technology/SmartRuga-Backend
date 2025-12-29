// src/utils/cookies.ts
import { Response } from "express";

export function setRefreshCookie(res: Response, token: string) {
  const secure = (process.env.COOKIE_SECURE || "false") === "true";
  const domain = process.env.COOKIE_DOMAIN || undefined;

  res.cookie("rt", token, {
    httpOnly: true,
    secure,
    sameSite: "lax",
    domain,
    path: "/api/v1/auth",
  });
}

export function clearRefreshCookie(res: Response) {
  const secure = (process.env.COOKIE_SECURE || "false") === "true";
  const domain = process.env.COOKIE_DOMAIN || undefined;

  res.clearCookie("rt", {
    httpOnly: true,
    secure,
    sameSite: "lax",
    domain,
    path: "/api/v1/auth",
  });
}
