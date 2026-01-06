import z from "zod";

export const OutputSchema = z.object({
	id: z.hex(),
	type: z.string(),
	content: z.string(),
	importance: z.number().min(0).max(100),
});

export type Output = z.infer<typeof OutputSchema>;
