import { Router } from "express";
import { z } from "zod";
import {
  ALL_CATEGORIES,
  CURRENCIES,
  isCustomCategory,
  MOVEMENT_TYPES,
  PAYMENT_METHODS,
  SORT_FIELDS,
  SORT_ORDERS,
} from "../../shared/catalog.js";
import { isValidISODate, movementSchema, sharedExpenseSchema } from "../../shared/movementSchema.js";
import { HttpError } from "../errors.js";

const optionalDate = z
  .string()
  .refine(isValidISODate, { error: "errorDateInvalid" })
  .optional();

const listQuerySchema = z
  .object({
    type: z.enum(MOVEMENT_TYPES).optional(),
    category: z
      .string()
      .refine((value) => ALL_CATEGORIES.includes(value) || isCustomCategory(value))
      .optional(),
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

// Borrado de varios movimientos elegidos en el historial.
export const BULK_DELETE_MAX = 500;
const bulkDeleteSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1).max(BULK_DELETE_MAX),
});

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

export function movementsRouter(repo, categories, receivables) {
  const router = Router();

  router.get("/", async (req, res) => {
    const filters = listQuerySchema.parse(compact(req.query));
    res.json(await repo.list(req.user.id, filters));
  });

  // Antes de "/:id" para que "bulk-delete" no se tome como un id.
  router.post("/bulk-delete", async (req, res) => {
    const { ids } = bulkDeleteSchema.parse(req.body ?? {});
    res.json({ deleted: await repo.removeMany(req.user.id, [...new Set(ids)]) });
  });

  // Gasto compartido: el gasto y lo que debe cada uno (en "Me deben").
  router.post("/shared", async (req, res) => {
    const data = sharedExpenseSchema.parse(req.body ?? {});
    await categories.assertUsable(req.user.id, data.type, data.category);
    const result = await receivables.createShared(req.user.id, data);
    res.status(201).json({ ...result, movement: await repo.get(req.user.id, result.movementId) });
  });

  router.get("/:id", async (req, res) => {
    const movement = await repo.get(req.user.id, parseId(req.params.id));
    if (!movement) throw new HttpError(404, "not_found");
    res.json(movement);
  });

  router.post("/", async (req, res) => {
    const data = movementSchema.parse(req.body ?? {});
    await categories.assertUsable(req.user.id, data.type, data.category);
    res.status(201).json(await repo.create(req.user.id, data));
  });

  router.put("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    const data = movementSchema.parse(req.body ?? {});
    await categories.assertUsable(req.user.id, data.type, data.category);
    const movement = await repo.update(req.user.id, id, data);
    if (!movement) throw new HttpError(404, "not_found");
    res.json(movement);
  });

  router.delete("/:id", async (req, res) => {
    const deleted = await repo.remove(req.user.id, parseId(req.params.id));
    if (!deleted) throw new HttpError(404, "not_found");
    res.status(204).end();
  });

  return router;
}
