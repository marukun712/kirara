import z, { ZodObject } from "zod";

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

export const ConfigSchema = z.object({
	events: z.record(z.string(), z.instanceof(ZodObject)),
	parameters: z.record(
		z.string(),
		z.object({
			initial: z.number(),
			schema: z.number(),
			description: z.string(),
		}),
	),
});

export const InputMessageSchema = z.object({
	type: z.literal("input"),
	event: z.string(),
	data: z.unknown(),
});

export const OutputMessageSchema = z.object({
	type: z.literal("output"),
	parameter: z.record(z.string(), z.number().min(0).max(1)),
});

export type InputMessage = z.infer<typeof InputMessageSchema>;
export type OutputMessage = z.infer<typeof OutputMessageSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type Transition = z.infer<typeof TransitionSchema>;
export type Transitions = z.infer<typeof TransitionsSchema>;
