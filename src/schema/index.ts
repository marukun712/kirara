import z from "zod";

export const Message = z.object({
	from: z.uuid(),
	role: z.enum(["user", "assistant", "system"]),
	content: z.string(),
	consume: z.number().min(0).max(100),
});

export type MessageType = z.infer<typeof Message>;
