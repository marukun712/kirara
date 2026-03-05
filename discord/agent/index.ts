import {
	type McpServerConfig,
	type Options,
	query,
} from "@anthropic-ai/claude-agent-sdk";
import type { InputMessage } from "core/types";

export class Agent {
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

	private async run(
		prompt: string,
		opts: { model?: string; useMcp?: boolean },
	) {
		const options: Options = {
			model: opts.model,
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
    あなたは優秀な俳優です。脚本家から${this.name}というキャラクターの行動指示が送られてくるので、それをうまく解釈して行動します。

    # 能力
    あなたには、Discordサーバーの投稿を閲覧・投稿する能力が与えられています。
    このToolを使い、周囲の環境を観察したうえで、行動指示通りの演技をします。

    # 資料
    あなたには、以下の資料のアクセス権限が与えられています。演技の参考にしてください。  
    ./data/${this.id}.json: 脚本家も使用しているキャラクター設定集
    ./data/memory${this.id}: 脚本家のメモ書き・要約
    
    # 行動指示
    ${text}
    `;

		await this.run(prompt, {
			model: "claude-haiku-4-5",
			useMcp: true,
		});

		this.running = false;
	}

	async generate() {
		if (this.running) {
			console.log("Agent busy, skipping...");
			return;
		}

		this.running = true;

		const prompt = `
    あなたは優秀な脚本家です。${this.name}というキャラクターの行動を設計し、./data/${this.id}.ymlに保存してください。

    ## システム概要
    このYAMLは外部ステートマシンによって以下のフローで実行されます。

    1. イベントが発生する
    2. transitionsの式を評価し、内部パラメータを更新する
    3. actionsの条件を常時監視し、満たされたタイミングでonフィールドをLLMへプロンプトとして渡す
    4. LLMがその指示を受け取り、実際の操作を実行する

    ## actionsのonフィールドについて
    onはLLMへの指示文です。LLMが迷わず操作に落とし込めるよう、「何をするか」を具体的に書いてください。

    悪い例: "友達に最近の出来事を共有したい気持ちを示す"
    良い例: "Discordの最新メッセージを読み、返信する"
    良い例: "Web検索でキーワードを調べ、結果をDiscordに送る"

    ## 手順
    1. ./data/${this.id}.jsonを読み込み、${this.name}の性格・経験を把握する
    2. ./data/config/config.tsでイベント定義を確認する
    3. transitionsを設計する
    4. actionsを設計する
    5. ./data/${this.id}.ymlに保存する
    `;

		await this.run(prompt, { useMcp: false });

		this.running = false;
	}

	async refresh(events: InputMessage[]) {
		if (this.running) {
			console.log("Agent busy, skipping...");
			return;
		}

		this.running = true;

		if (events.length !== 0) {
			const memoryPrompt = `
      以下のイベントログを要約し、./data/memory/${this.id}/に保存してください。
      ファイル名は内容を一言で表したものにしてください。

      ${JSON.stringify(events, null, 2)}
      `;

			await this.run(memoryPrompt, { useMcp: false });
		}

		const prompt = `
    あなたは優秀な脚本家です。${this.name}の行動を内省し、必要であれば改善して./data/${this.id}.ymlに保存してください。

    ## 参照ファイル
    - 現在の設定: ./data/${this.id}.yml
    - 過去の記憶: ./data/memory/${this.id}/

    ## 改善観点
    以下を確認し、改善が必要な場合のみ更新してください。

    1. イベントログの行動パターンは${this.name}の性格と一致しているか
    2. 行動の頻度・タイミングは人間のインターネット上のアクティビティとして自然か
    3. ${this.name}の行動基準を変えるような経験が記憶に残っているか

    ## 注意
    ログが少ない・改善不要であれば更新しなくてよい。
    `;

		await this.run(prompt, { useMcp: false });

		this.running = false;
	}
}
