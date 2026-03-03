import z from "zod";

export const config = {
	events: {
		msg: z.object({
			content: z.string(),
		}),
	},
	params: {
		want_to_speak: z.number(),
		web_attention: z.number(),
		discord_attention: z.number(),
		boredom: z.number(),
	},
};
