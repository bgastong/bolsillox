import { Router } from "express";
import { budgetCategorySchema, budgetSchema } from "../../shared/movementSchema.js";
import { HttpError } from "../errors.js";
import { monthRange } from "../summary.js";
import { parseMonth } from "../params.js";

export function budgetsRouter(budgets, rates) {
  const router = Router();

  router.get("/", async (req, res) => {
    const month = parseMonth(req.query.month);
    const { from, to } = monthRange(month);
    const rate = await rates.getActiveRate(req.user.id);
    res.json({ month, ...(await budgets.list(req.user.id, { from, to, rate })) });
  });

  router.put("/:category", async (req, res) => {
    const category = parseCategory(req.params.category);
    const { amount } = budgetSchema.parse(req.body ?? {});
    await budgets.set(req.user.id, category, amount);
    res.json({ category, amount });
  });

  router.delete("/:category", async (req, res) => {
    if (!(await budgets.remove(req.user.id, parseCategory(req.params.category)))) {
      throw new HttpError(404, "not_found");
    }
    res.status(204).end();
  });

  return router;
}

function parseCategory(raw) {
  const result = budgetCategorySchema.safeParse(raw);
  if (!result.success) throw new HttpError(400, "invalid_category");
  return result.data;
}
