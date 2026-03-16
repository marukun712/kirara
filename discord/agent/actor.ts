import {
	type McpServerConfig,
	type Options,
	query,
} from "@anthropic-ai/claude-agent-sdk";

export class Actor {
	private readonly mcpServers: Record<string, McpServerConfig>;
	private running: boolean = false;

	constructor(mcpServers: Record<string, McpServerConfig>) {
		this.mcpServers = mcpServers;
	}

	private async run(prompt: string, opts: { useMcp?: boolean }) {
		const options: Options = {
			settingSources: ["project"],
		};

		if (opts.useMcp) {
			options.mcpServers = this.mcpServers;
		}
		const stream = query({
			prompt,
			options,
		});

		for await (const event of stream) {
			switch (event.type) {
				case "assistant":
					for (const block of event.message.content) {
						if ("text" in block) {
							console.log("[assistant:text]", block.text);
						} else if ("name" in block) {
							console.log("[assistant:tool_use]", block.name, block.input);
						}
					}
					break;
				case "result":
					console.log("[result]", event.subtype, event.total_cost_usd);
					break;
			}
		}
	}

	async act(text: string, ctx: string) {
		if (this.running) {
			console.log("Agent busy, skipping...");
			return;
		}

		this.running = true;

		const prompt = `
    現在時刻は${new Date().toLocaleString()}です。

    # 役割
    あなたは、./data/CHARACTER.mdに記載されているキャラクターとして行動します。

    # 手順
    - Obsidianを確認して、このキャラクターに既存のアクティビティがあるかを確認します。
    - 行動と感情を、Obsidianのデイリーノートに保存してください。

    # 注意事項
    - 行動のバッファは2分程度持たせるようにしましょう。
    - ファイルには、必ず相対パスでアクセスしてください。
    - Obsidianは自由に使用することができます。自分で確認しやすいような情報の整理をしましょう。
    - あなたの行動予定は、./data/plan.jsonで見れます。
    - 急ぎの用ができたら、plan.jsonの行動を書き換えてもよいです。
    
    # コンテキスト
    ${ctx}

    # 行動
    ${text}
    `;

		await this.run(prompt, {
			useMcp: true,
		});

		this.running = false;
	}
}
