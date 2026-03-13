import {
	type McpServerConfig,
	type Options,
	query,
} from "@anthropic-ai/claude-agent-sdk";

export class Actor {
	readonly id;
	readonly name;
	private readonly mcpServers: Record<string, McpServerConfig>;
	private running: boolean = false;

	constructor(
		id: string,
		name: string,
		mcpServers: Record<string, McpServerConfig>,
	) {
		this.id = id;
		this.name = name;
		this.mcpServers = mcpServers;
	}

	private async run(prompt: string, opts: { useMcp?: boolean }) {
		const options: Options = {
			model: "claude-haiku-4-5",
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
    現在時刻は${Date.now().toLocaleString()}です。

    あなたは優秀な俳優です。脚本家から${this.name}というキャラクターの行動指示が送られてくるので、それをうまく解釈して行動します。
 
    # メモ書き
    あなたの行動内容のまとめを./data/memory/${this.id}にファイルとして保存してください。
    あなたが脚本家の指示に従う俳優で、どういう行動をしたかを明示してください。
    ファイル名は行動を一言で言い表したものにしてください。
    必ずタイムスタンプを記録してください。

    # 行動指示
    ${text}

    ファイルには必ず相対パスでアクセスしてください。
    `;

		await this.run(prompt, {
			useMcp: true,
		});

		this.running = false;
	}
}
