import z from "zod";
import { ActionSchema } from "../schema/index.ts";

export const ActionMessageSchema = z.object({
	type: z.literal("action"),
	action: ActionSchema,
	timestamp: z.number(),
});

export type ActionMessage = z.infer<typeof ActionMessageSchema>;
