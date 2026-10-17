import { Router } from "express";
import { z } from "zod";
import { receivablePaymentSchema, receivableSchema } from "../../shared/movementSchema.js";
import { HttpError } from "../errors.js";

const idSchema = z.coerce.number().int().positive();

function parseId(raw) {
  const result = idSchema.safeParse(raw);
  if (!result.success) throw new HttpError(400, "invalid_id");
  return result.data;
}

export function receivablesRouter(receivables) {
  const router = Router();

  router.get("/", async (req, res) => {
    res.json(await receivables.list(req.user.id));
  });

  router.post("/", async (req, res) => {
    const data = receivableSchema.parse(req.body ?? {});
    res.status(201).json(await receivables.create(req.user.id, data));
  });

  router.put("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    const data = receivableSchema.parse(req.body ?? {});
    const item = await receivables.update(req.user.id, id, data);
    if (!item) throw new HttpError(404, "not_found");
    res.json(item);
  });

  router.delete("/:id", async (req, res) => {
    if (!(await receivables.remove(req.user.id, parseId(req.params.id)))) throw new HttpError(404, "not_found");
    res.status(204).end();
  });

  // Cobro total o parcial; opcionalmente lo carga como ingreso.
  router.post("/:id/payments", async (req, res) => {
    const id = parseId(req.params.id);
    const data = receivablePaymentSchema.parse(req.body ?? {});
    const item = await receivables.addPayment(req.user.id, id, data);
    if (!item) throw new HttpError(404, "not_found");
    res.json(item);
  });

  return router;
}
