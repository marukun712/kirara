import type { Config } from "core/types";
import z from "zod";

export const config: Config = {
	events: {
		speak: z
			.object({
				timestamp: z.string(),
			})
			.describe("自分が発言した時のeffectイベント"),
		search: z
			.object({
				timestamp: z.string(),
			})
			.describe("自分がWeb検索した時のeffectイベント"),
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
		watching:
			"Discordをじっと見る。返信待ち、会話観察など。Watchingしている間はすべてのメッセージに返信してしまうので注意",
		speak: "自分から発言する",
		web_search: "ネットサーフィンしてコンテキストに積む",
	},
} as const;
