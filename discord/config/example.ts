import type { Config } from "core/types";
import z from "zod";

export const config: Config = {
	events: {
		mention: z
			.object({
				from: z.string(),
				content: z.string(),
			})
			.describe("Discordであなたにメンションがあったときのイベント"),
		msg: z
			.object({
				from: z.string(),
				content: z.string(),
			})
			.describe(
				"自分の所属しているDiscordサーバーにメッセージが送信されたときのイベント",
			),
		tick: z
			.object({
				timestamp: z.string(),
			})
			.describe(
				"状態更新のための定期送信イベント。1tick=500msであることに注意",
			),
	},
} as const;
