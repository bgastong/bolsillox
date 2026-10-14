import { Router } from "express";
import { z } from "zod";
import { recurringSchema } from "../../shared/movementSchema.js";
import { HttpError } from "../errors.js";

const idSchema = z.coerce.number().int().positive();
const paySchema = z.object({
  month: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: "errorMonthInvalid" }),
});

function parseId(raw) {
  const result = idSchema.safeParse(raw);
  if (!result.success) throw new HttpError(400, "invalid_id");
  return result.data;
}

export function recurringRouter(recurring, categories) {
  const router = Router();

  router.get("/", async (req, res) => {
    res.json(await recurring.list(req.user.id));
  });

  // Cuotas por vencer o vencidas sin pagar (antes de "/:id").
  router.get("/alerts", async (req, res) => {
    res.json(await recurring.alerts(req.user.id));
  });

  router.get("/:id", async (req, res) => {
    const rule = await recurring.get(req.user.id, parseId(req.params.id));
    if (!rule) throw new HttpError(404, "not_found");
    res.json(rule);
  });

  router.post("/", async (req, res) => {
    const data = recurringSchema.parse(req.body ?? {});
    await categories.assertUsable(req.user.id, data.type, data.category);
    res.status(201).json(await recurring.create(req.user.id, data));
  });

  router.put("/:id", async (req, res) => {
    const id = parseId(req.params.id);
    const data = recurringSchema.parse(req.body ?? {});
    await categories.assertUsable(req.user.id, data.type, data.category);
    const rule = await recurring.update(req.user.id, id, data);
    if (!rule) throw new HttpError(404, "not_found");
    res.json(rule);
  });

  // Marca como pagada la cuota de un mes: carga el gasto con la fecha de hoy.
  router.post("/:id/pay", async (req, res) => {
    const { month } = paySchema.parse(req.body ?? {});
    const rule = await recurring.pay(req.user.id, parseId(req.params.id), month);
    if (!rule) throw new HttpError(404, "not_found");
    res.json(rule);
  });

  router.delete("/:id", async (req, res) => {
    if (!(await recurring.remove(req.user.id, parseId(req.params.id)))) throw new HttpError(404, "not_found");
    res.status(204).end();
  });

  return router;
}
