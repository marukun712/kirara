import type { Config } from "core/types";
import z from "zod";

export const config: Config = {
	events: {
		mention: z.object({
			from: z.string(),
			content: z.string(),
		}),
		msg: z.object({
			from: z.string(),
			content: z.string(),
		}),
		tick: z.object({
			timestamp: z.number(),
		}),
	},
} as const;
