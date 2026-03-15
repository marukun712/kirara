import z from "zod";

export const events = [
	z.object({
		name: z.literal("tick"),
		data: z.object({ timestamp: z.string() }),
	}),
	z.object({
		name: z.literal("msg"),
		data: z.object({ content: z.string(), author: z.string() }),
	}),
	z.object({
		name: z.literal("mention"),
		data: z.object({ content: z.string(), author: z.string() }),
	}),
];

export const states = ["idle", "searching", "speaking", "watching_after_speak"];
