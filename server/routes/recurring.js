import { Router } from "express";
import { z } from "zod";
import { recurringSchema } from "../../shared/movementSchema.js";
import { HttpError } from "../errors.js";

const idSchema = z.coerce.number().int().positive();

function parseId(raw) {
  const result = idSchema.safeParse(raw);
  if (!result.success) throw new HttpError(400, "invalid_id");
  return result.data;
}

export function recurringRouter(recurring) {
  const router = Router();

  router.get("/", (req, res) => {
    res.json(recurring.list());
  });

  router.get("/:id", (req, res) => {
    const rule = recurring.get(parseId(req.params.id));
    if (!rule) throw new HttpError(404, "not_found");
    res.json(rule);
  });

  router.post("/", (req, res) => {
    const data = recurringSchema.parse(req.body ?? {});
    res.status(201).json(recurring.create(data));
  });

  router.put("/:id", (req, res) => {
    const id = parseId(req.params.id);
    const data = recurringSchema.parse(req.body ?? {});
    const rule = recurring.update(id, data);
    if (!rule) throw new HttpError(404, "not_found");
    res.json(rule);
  });

  router.delete("/:id", (req, res) => {
    if (!recurring.remove(parseId(req.params.id))) throw new HttpError(404, "not_found");
    res.status(204).end();
  });

  return router;
}
