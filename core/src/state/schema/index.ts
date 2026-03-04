import z from "zod";

export const ActionContextSchema = z.record(z.string(), z.unknown());

export const ActionSchema = z.object({
  name: z.string(),
  context: ActionContextSchema,
});

export const StateTransitionSchema = z.object({
  condition: z.string(),
  action: ActionSchema,
  description: z.string().optional(),
});

export const StatesConfigSchema = z.object({
  version: z.string(),
  description: z.string().optional(),
  transitions: z.array(StateTransitionSchema),
});

export type Action = z.infer<typeof ActionSchema>;
export type StateTransition = z.infer<typeof StateTransitionSchema>;
export type StatesConfig = z.infer<typeof StatesConfigSchema>;
