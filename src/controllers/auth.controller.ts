import { Request, Response } from "express";
import bcrypt from "bcrypt";
import { StatusCodes } from "http-status-codes";

import { User, RefreshToken } from "../models";
import { sha256 } from "../utils/crypto";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  refreshExpiryDate,
} from "../utils/jwt";
import { loginSchema, registerSchema } from "../validators/auth.validator";
import { clearRefreshCookie, setRefreshCookie } from "../utils/cookies";
import { PLATFORM_ROLES } from "../constants/roles";
import { errorResponse, successResponse } from "../utils/apiResponse";

// Register a new user
export async function register(req: Request, res: Response) {
  try {
    const parsed = registerSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Invalid payload",
          errors: parsed.error.issues,
        })
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const { password, firstName, lastName } = parsed.data;

    const exists = await User.findOne({ where: { email } });
    if (exists) {
      return res.status(StatusCodes.CONFLICT).json(
        errorResponse({
          message: "Email already in use",
        })
      );
    }

    const password_hash = await bcrypt.hash(password, 12);

    const user = await User.create({
      email,
      password_hash,
      first_name: firstName ?? null,
      last_name: lastName ?? null,
      platform_role: PLATFORM_ROLES.USER,
    } as any);

    const platformRole = user.get(
      "platform_role"
    ) as (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

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

    return res.status(StatusCodes.CREATED).json(
      successResponse({
        message: "Registration successful",
        data: {
          user: {
            id: user.get("id"),
            email: user.get("email"),
            firstName: user.get("first_name"),
            lastName: user.get("last_name"),
            platformRole,
          },
          accessToken,
        },
      })
    );
  } catch (err: any) {
    console.error("REGISTER_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Registration failed",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

// Login an existing user
export async function login(req: Request, res: Response) {
  try {
    const parsed = loginSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Invalid payload",
          errors: parsed.error.issues,
        })
      );
    }

    const email = parsed.data.email.toLowerCase().trim();
    const { password } = parsed.data;

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(StatusCodes.UNAUTHORIZED).json(
        errorResponse({
          message: "Invalid credentials",
        })
      );
    }

    const ok = await bcrypt.compare(
      password,
      user.get("password_hash") as string
    );

    if (!ok) {
      return res.status(StatusCodes.UNAUTHORIZED).json(
        errorResponse({
          message: "Invalid credentials",
        })
      );
    }

    const platformRole = user.get(
      "platform_role"
    ) as (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];

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

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Login successful",
        data: {
          user: {
            id: user.get("id"),
            email: user.get("email"),
            firstName: user.get("first_name"),
            lastName: user.get("last_name"),
            platformRole,
          },
          accessToken,
        },
      })
    );
  } catch (err: any) {
    console.error("LOGIN_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Login failed",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

// Refresh access token
export async function refresh(req: Request, res: Response) {
  try {
    const token: string | undefined = req.cookies?.rt || req.body?.refreshToken;

    if (!token) {
      return res.status(StatusCodes.UNAUTHORIZED).json(
        errorResponse({
          message: "Missing refresh token",
        })
      );
    }

    let decoded: {
      userId: string;
      platformRole: (typeof PLATFORM_ROLES)[keyof typeof PLATFORM_ROLES];
    };

    try {
      decoded = verifyRefreshToken(token);
    } catch {
      return res.status(StatusCodes.UNAUTHORIZED).json(
        errorResponse({
          message: "Invalid/expired refresh token",
        })
      );
    }

    const tokenHash = sha256(token);

    const saved = await RefreshToken.findOne({
      where: { token_hash: tokenHash },
    });

    if (!saved) {
      return res.status(StatusCodes.BAD_REQUEST).json(
        errorResponse({
          message: "Refresh token not recognized",
        })
      );
    }

    if (saved.get("revoked_at")) {
      return res.status(StatusCodes.UNAUTHORIZED).json(
        errorResponse({
          message: "Refresh token revoked",
        })
      );
    }

    const expiresAt = saved.get("expires_at") as Date;
    if (expiresAt.getTime() < Date.now()) {
      return res.status(StatusCodes.UNAUTHORIZED).json(
        errorResponse({
          message: "Refresh token expired",
        })
      );
    }

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

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Token refreshed successfully",
        data: {
          accessToken: newAccess,
        },
      })
    );
  } catch (err: any) {
    console.error("REFRESH_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Token refresh failed",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}

// Logout user
export async function logout(req: Request, res: Response) {
  try {
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

    return res.status(StatusCodes.OK).json(
      successResponse({
        message: "Logout successful",
        data: {
          ok: true,
        },
      })
    );
  } catch (err: any) {
    console.error("LOGOUT_ERROR:", err);
    return res.status(StatusCodes.INTERNAL_SERVER_ERROR).json(
      errorResponse({
        message: "Logout failed",
        errors: err?.message ?? "Unknown error",
      })
    );
  }
}