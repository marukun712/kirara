import z from "zod";

export const Message = z.object({
	id: z.hex(),
	type: z.string(),
	content: z.string(),
	importance: z.number().min(0).max(100),
});

export type MessageType = z.infer<typeof Message>;
