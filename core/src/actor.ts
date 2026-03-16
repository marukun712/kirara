import { type McpServerConfig, query } from "@anthropic-ai/claude-agent-sdk";

export class Actor {
	private readonly mcpServers: Record<string, McpServerConfig>;
	private running: boolean = false;
	private session: string | undefined = undefined;

	constructor(mcpServers: Record<string, McpServerConfig>) {
		this.mcpServers = mcpServers;
	}

	private async run(prompt: string) {
		const stream = query({
			prompt,
			options: {
				settingSources: ["project"],
				mcpServers: this.mcpServers,
				resume: this.session,
			},
		});

		for await (const event of stream) {
			if (event.type === "system" && event.subtype === "init") {
				this.session = event.session_id;
				console.log(`Session started with ID: ${this.session}`);
			}
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

    ./data/ACTOR.mdの内容に従ってください。
    ファイルには、必ず相対パスでアクセスしてください。
  
    # コンテキスト
    ${ctx}

    # 行動
    ${text}
    `;

		await this.run(prompt);

		this.running = false;
	}

	isBusy() {
		return this.running;
	}
}
