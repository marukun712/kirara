import z, { ZodObject } from "zod";

export const TransitionSchema = z.object({
	event: z.string(),
	parameter: z.string(),
	expression: z.string(),
	description: z.string().optional(),
});

export const ConfigSchema = z.object({
	events: z.record(z.string(), z.instanceof(ZodObject)),
});

export const ParamsSchema = z.record(
	z.string(),
	z.object({
		initial: z.number(),
		description: z.string(),
	}),
);

export const ActionSchema = z.object({
	expression: z.string(),
	on: z.string(),
	description: z.string().optional(),
});

export const CharacterSchema = z.object({
	version: z.string(),
	description: z.string().optional(),
	params: ParamsSchema,
	transitions: z.array(TransitionSchema),
	actions: z.array(ActionSchema),
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

export type Transition = z.infer<typeof TransitionSchema>;
export type Params = z.infer<typeof ParamsSchema>;
export type Action = z.infer<typeof ActionSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type Character = z.infer<typeof CharacterSchema>;
export type InputMessage = z.infer<typeof InputMessageSchema>;
export type OutputMessage = z.infer<typeof OutputMessageSchema>;
