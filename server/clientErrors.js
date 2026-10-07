import { z } from "zod";

// Error que manda la pagina: se recorta todo para que nadie pueda mandar textos enormes.
const text = (max) => z.string().trim().transform((value) => value.slice(0, max));

export const clientErrorSchema = z.object({
  message: text(1000).pipe(z.string().min(1)),
  stack: text(5000).optional().default(""),
  url: text(500).optional().default(""),
});
