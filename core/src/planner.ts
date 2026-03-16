import { type McpServerConfig, query } from "@anthropic-ai/claude-agent-sdk";

export class Planner {
	private readonly mcpServers: Record<string, McpServerConfig>;
	private running: boolean = false;

	constructor(mcpServers: Record<string, McpServerConfig>) {
		this.mcpServers = mcpServers;
	}

	private async run(prompt: string) {
		const stream = query({
			prompt,
			options: {
				settingSources: ["project"],
				mcpServers: this.mcpServers,
			},
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

	async update() {
		if (this.running) {
			console.log("Agent busy, skipping...");
			return;
		}

		this.running = true;

		const prompt = `
    現在時刻は${new Date().toLocaleString()}です。

    ./data/PLANNER.mdの内容に従ってください。
    `;

		await this.run(prompt);

		this.running = false;
	}

	isBusy() {
		return this.running;
	}
}
