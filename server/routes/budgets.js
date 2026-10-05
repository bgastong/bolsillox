import { Router } from "express";
import { budgetCategorySchema, budgetSchema } from "../../shared/movementSchema.js";
import { HttpError } from "../errors.js";
import { monthRange } from "../summary.js";
import { parseMonth } from "../params.js";

export function budgetsRouter(budgets, rates) {
  const router = Router();

  router.get("/", (req, res) => {
    const month = parseMonth(req.query.month);
    const { from, to } = monthRange(month);
    res.json({ month, ...budgets.list({ from, to, rate: rates.getActiveRate() }) });
  });

  router.put("/:category", (req, res) => {
    const category = parseCategory(req.params.category);
    const { amount } = budgetSchema.parse(req.body ?? {});
    budgets.set(category, amount);
    res.json({ category, amount });
  });

  router.delete("/:category", (req, res) => {
    if (!budgets.remove(parseCategory(req.params.category))) {
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
