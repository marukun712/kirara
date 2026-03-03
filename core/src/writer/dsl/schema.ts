import z from "zod";

export const TransitionSchema = z.object({
	event: z.string(),
	parameter: z.string(),
	expression: z.string(),
	description: z.string().optional(),
});

export const TransitionsSchema = z.object({
	version: z.string(),
	description: z.string().optional(),
	transitions: z.array(TransitionSchema),
});

export type Transition = z.infer<typeof TransitionSchema>;
export type Transitions = z.infer<typeof TransitionsSchema>;
