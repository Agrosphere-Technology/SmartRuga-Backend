import "express";
import type { AuthUser, RanchContext, RanchMembershipContext } from ".";

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
      ranch?: RanchContext;
      membership?: RanchMembershipContext;
    }
  }
}

export {};
