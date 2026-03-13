import type { Config } from "core/types";
import z from "zod";

export const config: Config = {
	events: {
		effect: z
			.object({
				timestamp: z.string(),
			})
			.describe("自分が行動した時のeffectイベント"),
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
				"状態更新のための定期送信イベント。あなたが設定したtickで送信されます",
			),
	},
	actions: {
		do_nothing: "何もしないということをする",
		speak: "自分から発言する",
		web_search: "ネットサーフィンしてコンテキストに積む",
	},
} as const;
