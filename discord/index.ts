import { query } from "@anthropic-ai/claude-agent-sdk";
import { Client } from "discord.js";
import z from "zod";
import { Actor } from "./agent/actor";
import { createDiscordMcpServer } from "./agent/mcp/discord";

const PlanSchema = z.array(z.object({ time: z.string(), action: z.string() }));

let generating = false;
async function generate() {
	if (generating) {
		console.log("Agent busy, skipping...");
		return;
	}
	generating = true;
	if (!process.env.OBSIDIAN_API_KEY) {
		throw new Error("Invalid API Key");
	}
	for await (const event of query({
		prompt: `
      現在時刻は${new Date().toLocaleString()}です。

      # 役割
      あなたは、優秀な脚本家です。
      ./data/CHARACTER.mdにあるキャラクターの1時間の行動計画を作成します。

      # スキーマ
      {
        time: 行動のタイムスタンプ${new Date().toLocaleString()}の形式
        action: "行動指示を簡潔に(string)"
      }
      の配列です。

      # 持ち物
      あなたはスマートフォンを持っています。
      このスマートフォンでは、Web検索をしたり、Discordを見たりすることができます。

      # 設計方針
      まず、Obsidianを確認して、このキャラクターに既存のアクティビティがあるかを確認します。
      Obsidianのデイリーノートにその日1日の行動計画を作成します。
      その1日の行動計画に従う形で、1時間の行動計画を作成してください。
  
      # 注意事項
      - 何もしていない時間を含めて行動計画を作成してください。何もしない場合には、idleというactionを指定してください。
      (idle以外の文字列は入れないこと)
      - ./data/plan.jsonに保存してください。
      - 更新する場合は、完全にファイルを上書きしてください。
      - ファイルには、必ず相対パスでアクセスしてください。
    `,
		options: {
			settingSources: ["project"],
			model: "claude-sonnet-4-6",
			mcpServers: {
				"obsidian-mcp-server": {
					command: "bunx",
					args: ["obsidian-mcp-server"],
					env: {
						OBSIDIAN_API_KEY: process.env.OBSIDIAN_API_KEY,
						OBSIDIAN_BASE_URL: "http://127.0.0.1:27123",
						OBSIDIAN_VERIFY_SSL: "false",
						OBSIDIAN_ENABLE_CACHE: "true",
					},
				},
			},
		},
	})) {
		switch (event.type) {
			case "assistant":
				for (const block of event.message.content) {
					if ("text" in block) console.log("[assistant:text]", block.text);
					else if ("name" in block)
						console.log("[assistant:tool_use]", block.name, block.input);
				}
				break;
			case "result":
				console.log("[result]", event.subtype, event.total_cost_usd);
				break;
		}
	}
	generating = false;
}

class AgentLoop {
	timer?: Timer;
	ctx: string = "";
	done: Set<string> = new Set<string>();
	parsed: z.infer<typeof PlanSchema> = [];
	actor: Actor;

	constructor(actor: Actor) {
		this.actor = actor;
		this.done.add("idle");
	}

	async load() {
		let file = Bun.file("./data/plan.json");
		if (!(await file.exists())) {
			await generate();
			file = Bun.file("./data/plan.json");
		}
		const json = await file.json();
		this.parsed = PlanSchema.parse(json).sort(
			(a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
		);
	}

	start() {
		this.timer = setInterval(async () => {
			if (generating) return;
			const now = Date.now();
			// 現在時刻より前のイベントを取得
			const previous = this.parsed.filter(
				(i) => new Date(i.time).getTime() <= now,
			);
			// 現在時刻より前の最新イベント
			const latest = previous.at(-1);

			// 現在のすべてのイベントが現在時刻より前のものだった場合
			if (previous.length === this.parsed.length) {
				await generate();
				await this.reload();
				return;
			}

			// イベントを実行
			if (!latest || this.done.has(latest.action)) return;
			console.log(latest.action);
			this.done.add(latest.action);
			await this.actor.act(latest.action, this.ctx);
			this.ctx = "";
		}, 1000);
	}

	async reload() {
		if (this.timer) clearInterval(this.timer);
		await this.load();
		this.start();
	}

	addCtx(ctx: string) {
		this.ctx += `${ctx}\n`;
	}
}

const client = new Client({
	intents: ["Guilds", "GuildMessages", "MessageContent"],
});
client.login(process.env.DISCORD_TOKEN);
if (!process.env.OBSIDIAN_API_KEY) {
	throw new Error("Invalid API Key");
}

const actor = new Actor({
	discord: createDiscordMcpServer(client),
	"obsidian-mcp-server": {
		command: "bunx",
		args: ["obsidian-mcp-server"],
		env: {
			OBSIDIAN_API_KEY: process.env.OBSIDIAN_API_KEY,
			OBSIDIAN_BASE_URL: "http://127.0.0.1:27123",
			OBSIDIAN_VERIFY_SSL: "false",
			OBSIDIAN_ENABLE_CACHE: "true",
		},
	},
});

const loop = new AgentLoop(actor);
await loop.reload();

client.on("messageCreate", async (message) => {
	if (!client.user) return;
	if (message.mentions.users.has(client.user.id)) {
		loop.addCtx(
			`${message.author.id}:${message.author.displayName}があなたにメンションをしました`,
		);
		await actor.act("メンションの通知音が聞こえたので、確認する。", loop.ctx);
	}
});
