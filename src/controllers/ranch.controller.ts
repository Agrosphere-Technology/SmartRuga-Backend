import { Request, Response } from "express";
import slugify from "slugify";
import { Ranch, RanchMember } from "../models";
import { createRanchSchema } from "../validators/ranch.validator";
import { StatusCodes } from "http-status-codes";

export async function createRanch(req: Request, res: Response) {
  const parsed = createRanchSchema.safeParse(req.body);
  if (!parsed.success) {
    return res
      .status(StatusCodes.BAD_REQUEST)
      .json({ message: "Invalid payload", issues: parsed.error.issues });
  }

  const userId = req.user!.id;
  const { name, locationName, address, latitude, longitude } = parsed.data;

  const baseSlug = slugify(name, { lower: true, strict: true, trim: true });
  let slug = baseSlug;
  let counter = 1;

  while (await Ranch.findOne({ where: { slug } })) {
    slug = `${baseSlug}-${counter++}`;
  }

  const ranch = await Ranch.create({
    name,
    slug,
    created_by: userId,
    // only if you added the location fields migration
    location_name: locationName ?? null,
    address: address ?? null,
    latitude: latitude ?? null,
    longitude: longitude ?? null,
  } as any);

  const membership = await RanchMember.create({
    ranch_id: ranch.get("id"),
    user_id: userId,
    role: "owner",
    status: "active",
  } as any);

  return res.status(StatusCodes.CREATED).json({
    ranch: {
      id: ranch.get("id"),
      name: ranch.get("name"),
      slug: ranch.get("slug"),
      locationName: ranch.get("location_name") ?? null,
      address: ranch.get("address") ?? null,
      latitude: ranch.get("latitude") ?? null,
      longitude: ranch.get("longitude") ?? null,
    },
    membership: {
      id: membership.get("id"),
      role: membership.get("role"),
      status: membership.get("status"),
    },
  });
}

export async function listAllRanches(req: Request, res: Response) {
  const userId = req.user!.id;

  const memberships = await RanchMember.findAll({
    where: { user_id: userId },
    include: [{ model: Ranch, as: "ranch" }],
    order: [["created_at", "DESC"]],
  });

  const ranches = memberships.map((m: any) => {
    const ranch = m.ranch;
    return {
      id: ranch.id,
      name: ranch.name,
      slug: ranch.slug,
      role: m.role,
      status: m.status,
    };
  });

  return res.json({ ranches });
}

export async function getRanchBySlug(req: Request, res: Response) {
  const userId = req.user!.id;
  const { slug } = req.params;

  const ranch = await Ranch.findOne({ where: { slug } });
  if (!ranch)
    return res
      .status(StatusCodes.NOT_FOUND)
      .json({ message: "Ranch not found" });

  const membership = await RanchMember.findOne({
    where: { ranch_id: ranch.get("id"), user_id: userId },
  });

  if (!membership)
    return res.status(StatusCodes.FORBIDDEN).json({ message: "Access denied" });
  if (membership.get("status") !== "active")
    return res
      .status(StatusCodes.FORBIDDEN)
      .json({ message: "Membership not active" });

  return res.json({
    ranch: {
      id: ranch.get("id"),
      name: ranch.get("name"),
      slug: ranch.get("slug"),
      locationName: ranch.get("location_name") ?? null,
      address: ranch.get("address") ?? null,
      latitude: ranch.get("latitude") ?? null,
      longitude: ranch.get("longitude") ?? null,
    },
    membership: {
      id: membership.get("id"),
      role: membership.get("role"),
      status: membership.get("status"),
    },
  });
}
