import { Router } from "express";
import { z } from "zod";
import { goalEntrySchema, goalSchema } from "../../shared/movementSchema.js";
import { HttpError } from "../errors.js";

const idSchema = z.coerce.number().int().positive();

function parseId(raw) {
  const result = idSchema.safeParse(raw);
  if (!result.success) throw new HttpError(400, "invalid_id");
  return result.data;
}

export function goalsRouter(goals) {
  const router = Router();

  router.get("/", async (req, res) => {
    res.json(await goals.list(req.user.id));
  });

  router.post("/", async (req, res) => {
    const data = goalSchema.parse(req.body ?? {});
    res.status(201).json(await goals.create(req.user.id, data));
  });

  router.put("/:id", async (req, res) => {
    const data = goalSchema.parse(req.body ?? {});
    const goal = await goals.update(req.user.id, parseId(req.params.id), data);
    if (!goal) throw new HttpError(404, "not_found");
    res.json(goal);
  });

  router.delete("/:id", async (req, res) => {
    if (!(await goals.remove(req.user.id, parseId(req.params.id)))) throw new HttpError(404, "not_found");
    res.status(204).end();
  });

  // Aportar o sacar plata de la meta (opcionalmente cargado en los movimientos).
  router.post("/:id/entries", async (req, res) => {
    const data = goalEntrySchema.parse(req.body ?? {});
    const goal = await goals.addEntry(req.user.id, parseId(req.params.id), data);
    if (!goal) throw new HttpError(404, "not_found");
    res.json(goal);
  });

  router.delete("/:id/entries/:entryId", async (req, res) => {
    const id = parseId(req.params.id);
    if (!(await goals.removeEntry(req.user.id, id, parseId(req.params.entryId)))) {
      throw new HttpError(404, "not_found");
    }
    res.json(await goals.get(req.user.id, id));
  });

  return router;
}
