import { Router } from "express";
import { z } from "zod";
import {
  ALL_CATEGORIES,
  CURRENCIES,
  MOVEMENT_TYPES,
  PAYMENT_METHODS,
  SORT_FIELDS,
  SORT_ORDERS,
} from "../../shared/catalog.js";
import { isValidISODate, movementSchema } from "../../shared/movementSchema.js";
import { HttpError } from "../errors.js";

const optionalDate = z
  .string()
  .refine(isValidISODate, { error: "errorDateInvalid" })
  .optional();

const listQuerySchema = z
  .object({
    type: z.enum(MOVEMENT_TYPES).optional(),
    category: z.enum(ALL_CATEGORIES).optional(),
    paymentMethod: z.enum(PAYMENT_METHODS).optional(),
    currency: z.enum(CURRENCIES).optional(),
    from: optionalDate,
    to: optionalDate,
    q: z.string().trim().max(80).optional(),
    sort: z.enum(SORT_FIELDS).optional(),
    order: z.enum(SORT_ORDERS).optional(),
    limit: z.coerce.number().int().min(1).max(500).optional(),
  })
  .refine((data) => !data.from || !data.to || data.from <= data.to, {
    path: ["to"],
    error: "errorDateRange",
  });

const idSchema = z.coerce.number().int().positive();

// Los query params vacios (?type=) se ignoran.
function compact(query) {
  return Object.fromEntries(
    Object.entries(query).filter(([, value]) => value !== "" && value !== undefined),
  );
}

function parseId(raw) {
  const result = idSchema.safeParse(raw);
  if (!result.success) throw new HttpError(400, "invalid_id");
  return result.data;
}

export function movementsRouter(repo) {
  const router = Router();

  router.get("/", (req, res) => {
    const filters = listQuerySchema.parse(compact(req.query));
    res.json(repo.list(filters));
  });

  router.get("/:id", (req, res) => {
    const movement = repo.get(parseId(req.params.id));
    if (!movement) throw new HttpError(404, "not_found");
    res.json(movement);
  });

  router.post("/", (req, res) => {
    const data = movementSchema.parse(req.body ?? {});
    res.status(201).json(repo.create(data));
  });

  router.put("/:id", (req, res) => {
    const id = parseId(req.params.id);
    const data = movementSchema.parse(req.body ?? {});
    const movement = repo.update(id, data);
    if (!movement) throw new HttpError(404, "not_found");
    res.json(movement);
  });

  router.delete("/:id", (req, res) => {
    const deleted = repo.remove(parseId(req.params.id));
    if (!deleted) throw new HttpError(404, "not_found");
    res.status(204).end();
  });

  return router;
}
