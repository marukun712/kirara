import z, { ZodObject } from "zod";

export const TransitionSchema = z.object({
	on: z.string(),
	param: z.string(),
	expression: z.string(),
	description: z.string().optional(),
});

export const ParamsSchema = z.record(
	z.string(),
	z.object({
		normal: z.number(),
		description: z.string(),
	}),
);

export const ActionSchema = z.object({
	name: z.string(),
	expression: z.string(),
});

export const CharacterSchema = z.object({
	version: z.string(),
	description: z.string().optional(),
	tick: z.number(),
	params: ParamsSchema,
	transitions: z.array(TransitionSchema),
	actions: z.array(ActionSchema),
});

export const ConfigSchema = z.object({
	events: z.record(z.string(), z.instanceof(ZodObject)),
	actions: z.record(z.string(), z.string()),
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
export type Character = z.infer<typeof CharacterSchema>;
export type Config = z.infer<typeof ConfigSchema>;
export type InputMessage = z.infer<typeof InputMessageSchema>;
export type OutputMessage = z.infer<typeof OutputMessageSchema>;
