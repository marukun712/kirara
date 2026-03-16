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
			model: "claude-sonnet-4-6",
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

	async act(text: string) {
		if (this.running) {
			console.log("Agent busy, skipping...");
			return;
		}

		this.running = true;

		const prompt = `
    あなたは、./data/CHARACTER.mdに記載されているキャラクターとして以下の行動をします。
    まず、Obsidianを確認して、このキャラクターに既存のアクティビティがあるかを確認します。
    行動: ${text}
    あなたの行動と感情を、Obsidianのデイリーノートに保存してください。
    ファイルには、必ず相対パスでアクセスしてください。
    `;

		await this.run(prompt, {
			useMcp: true,
		});

		this.running = false;
	}
}
