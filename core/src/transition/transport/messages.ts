import z from "zod";

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
