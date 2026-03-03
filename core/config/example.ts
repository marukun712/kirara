import z from "zod";

export const config = {
	events: {
		msg: z.object({
			content: z.string(),
		}),
		tick: z.object({
			timestamp: z.number(),
		}),
	},

	parameters: {
		want_to_speak: {
			initial: 0,
			schema: z.number().min(0).max(1),
			description: "会話への参加意欲",
		},
		web_attention: {
			initial: 0,
			schema: z.number().min(0).max(1),
			description: "Web活動への集中度",
		},
		discord_attention: {
			initial: 0,
			schema: z.number().min(0).max(1),
			description: "Discord活動への集中度",
		},
		boredom: {
			initial: 0,
			schema: z.number().min(0).max(1),
			description: "退屈度",
		},
	},
} as const;

export type EventType = keyof typeof config.events;
export type ParameterName = keyof typeof config.parameters;
export type ParameterValues = Record<ParameterName, number>;
