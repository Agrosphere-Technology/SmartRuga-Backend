import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { z } from "zod";

import { User, RefreshToken } from "../models";
import { sha256 } from "../utils/crypto";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshExpiryDate,
} from "../utils/jwt";
import type { PlatformRole } from "../types";
import { loginSchema, registerSchema } from "../validators/auth.validator";
import { clearRefreshCookie, setRefreshCookie } from "../utils/cookies";

export async function register(req: Request, res: Response) {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid payload", issues: parsed.error.issues });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { password, firstName, lastName } = parsed.data;

  const exists = await User.findOne({ where: { email } });
  if (exists) return res.status(409).json({ message: "Email already in use" });

  const password_hash = await bcrypt.hash(password, 12);

  const user = await User.create({
    email,
    password_hash,
    first_name: firstName ?? null,
    last_name: lastName ?? null,
    platform_role: "user",
  } as any);

  const platformRole = user.get("platform_role") as PlatformRole;

  const accessToken = signAccessToken({
    userId: user.get("id") as string,
    platformRole,
  });
  const refreshToken = signRefreshToken({
    userId: user.get("id") as string,
    platformRole,
  });

  await RefreshToken.create({
    user_id: user.get("id"),
    token_hash: sha256(refreshToken),
    expires_at: refreshExpiryDate(),
    created_at: new Date(),
  } as any);

  setRefreshCookie(res, refreshToken);

  return res.status(201).json({
    user: {
      id: user.get("id"),
      email: user.get("email"),
      firstName: user.get("first_name"),
      lastName: user.get("last_name"),
      platformRole,
    },
    accessToken,
  });
}

export async function login(req: Request, res: Response) {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(400)
      .json({ message: "Invalid payload", issues: parsed.error.issues });
  }

  const email = parsed.data.email.toLowerCase().trim();
  const { password } = parsed.data;

  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(401).json({ message: "Invalid credentials" });

  const ok = await bcrypt.compare(
    password,
    user.get("password_hash") as string
  );
  if (!ok) return res.status(401).json({ message: "Invalid credentials" });

  const platformRole = user.get("platform_role") as PlatformRole;

  const accessToken = signAccessToken({
    userId: user.get("id") as string,
    platformRole,
  });
  const refreshToken = signRefreshToken({
    userId: user.get("id") as string,
    platformRole,
  });

  await RefreshToken.create({
    user_id: user.get("id"),
    token_hash: sha256(refreshToken),
    expires_at: refreshExpiryDate(),
    created_at: new Date(),
  } as any);

  setRefreshCookie(res, refreshToken);

  return res.json({
    user: {
      id: user.get("id"),
      email: user.get("email"),
      firstName: user.get("first_name"),
      lastName: user.get("last_name"),
      platformRole,
    },
    accessToken,
  });
}

export async function refresh(req: Request, res: Response) {
  // cookie-first (web), fallback to body (mobile-friendly)
  const token: string | undefined = req.cookies?.rt || req.body?.refreshToken;
  if (!token) return res.status(401).json({ message: "Missing refresh token" });

  let decoded: { userId: string; platformRole: PlatformRole };
  try {
    decoded = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ message: "Invalid/expired refresh token" });
  }

  const tokenHash = sha256(token);

  const saved = await RefreshToken.findOne({
    where: { token_hash: tokenHash },
  });
  if (!saved)
    return res.status(401).json({ message: "Refresh token not recognized" });

  if (saved.get("revoked_at"))
    return res.status(401).json({ message: "Refresh token revoked" });

  const expiresAt = saved.get("expires_at") as Date;
  if (expiresAt.getTime() < Date.now())
    return res.status(401).json({ message: "Refresh token expired" });

  // rotate refresh token
  const newRefresh = signRefreshToken({
    userId: decoded.userId,
    platformRole: decoded.platformRole,
  });
  const newHash = sha256(newRefresh);

  await saved.update({ revoked_at: new Date(), replaced_by_hash: newHash });

  await RefreshToken.create({
    user_id: decoded.userId,
    token_hash: newHash,
    expires_at: refreshExpiryDate(),
    created_at: new Date(),
  } as any);

  const newAccess = signAccessToken({
    userId: decoded.userId,
    platformRole: decoded.platformRole,
  });
  setRefreshCookie(res, newRefresh);

  return res.json({ accessToken: newAccess });
}

export async function logout(req: Request, res: Response) {
  const token: string | undefined = req.cookies?.rt || req.body?.refreshToken;

  if (token) {
    const tokenHash = sha256(token);
    const saved = await RefreshToken.findOne({
      where: { token_hash: tokenHash },
    });
    if (saved && !saved.get("revoked_at")) {
      await saved.update({ revoked_at: new Date() });
    }
  }

  clearRefreshCookie(res);
  return res.json({ ok: true });
}
