import { Router } from "express";
import { z } from "zod";
import { categorySchema, categoryUpdateSchema } from "../../shared/movementSchema.js";
import { HttpError } from "../errors.js";

const idSchema = z.coerce.number().int().positive();

function parseId(raw) {
  const result = idSchema.safeParse(raw);
  if (!result.success) throw new HttpError(400, "invalid_id");
  return result.data;
}

export function categoriesRouter(categories) {
  const router = Router();

  router.get("/", async (req, res) => {
    res.json(await categories.list(req.user.id));
  });

  router.post("/", async (req, res) => {
    const data = categorySchema.parse(req.body ?? {});
    res.status(201).json(await categories.create(req.user.id, data));
  });

  router.put("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    const data = categoryUpdateSchema.parse(req.body ?? {});
    const category = await categories.update(req.user.id, id, data);
    if (!category) throw new HttpError(404, "not_found");
    res.json(category);
  });

  // Responde cuantos movimientos pasaron a "Otros".
  router.delete("/:id", async (req, res) => {
    const result = await categories.remove(req.user.id, parseId(req.params.id));
    if (!result) throw new HttpError(404, "not_found");
    res.json(result);
  });

  return router;
}
