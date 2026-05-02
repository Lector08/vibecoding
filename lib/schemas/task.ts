import { z } from "zod";

export const priorityEnum = z.enum(["high", "medium", "low"]);
export type Priority = z.infer<typeof priorityEnum>;

export const parsedTaskSchema = z.object({
  title: z.string().min(1).max(200),
  priority: priorityEnum,
  deadline: z
    .string()
    .datetime({ offset: true })
    .nullable()
    .describe("ISO 8601 timestamp with timezone offset, or null"),
});
export type ParsedTask = z.infer<typeof parsedTaskSchema>;

export const DURATION_PRESETS = [15, 30, 60, 120] as const;
export type DurationPreset = (typeof DURATION_PRESETS)[number];

export const createTaskInputSchema = z.object({
  rawInput: z
    .string()
    .trim()
    .min(1, "errorEmpty")
    .max(1000, "errorTooLong"),
  timezone: z.string().trim().min(1).max(100).optional(),
  locale: z.string().trim().min(1).max(10).optional(),
  /** Optional manual deadline (ISO 8601 with offset). Wins over AI parsing. */
  deadlineOverride: z
    .string()
    .trim()
    .datetime({ offset: true })
    .optional()
    .or(z.literal("").transform(() => undefined)),
  /** Optional manual duration in minutes. */
  durationMinutes: z
    .union([z.string(), z.number()])
    .optional()
    .transform((v) => {
      if (v === undefined || v === null || v === "") return undefined;
      const n = typeof v === "number" ? v : Number(v);
      if (!Number.isFinite(n)) return undefined;
      const clamped = Math.max(5, Math.min(24 * 60, Math.round(n)));
      return clamped;
    }),
});
export type CreateTaskInput = z.infer<typeof createTaskInputSchema>;

/**
 * Patch shape for updating a task. All editable fields are optional so the
 * client can send partial updates. `null` for `deadline` / `durationMinutes`
 * means "clear this value"; `undefined` means "leave untouched".
 */
export const updateTaskInputSchema = z.object({
  taskId: z.string().min(1),
  title: z.string().trim().min(1, "errorEmpty").max(200, "errorTooLong").optional(),
  priority: priorityEnum.optional(),
  deadline: z
    .union([z.string().datetime({ offset: true }), z.null()])
    .optional(),
  durationMinutes: z
    .union([z.number().int().min(5).max(24 * 60), z.null()])
    .optional(),
  timezone: z.string().trim().min(1).max(100).optional(),
});
export type UpdateTaskInput = z.infer<typeof updateTaskInputSchema>;
