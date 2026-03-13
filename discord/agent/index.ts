import {
	createSdkMcpServer,
	query,
	tool,
} from "@anthropic-ai/claude-agent-sdk";
import { YAML } from "bun";
import { simulate } from "core/simulate";
import { CharacterSchema } from "core/types";

function createKiraraTools(id: string) {
	return createSdkMcpServer({
		name: "kirara",
		version: "1.0.0",
		tools: [
			tool(
				"simulate_character",
				"キャラクター設定をシミュレーションして時系列データを返す",
				{},
				async () => {
					const file = Bun.file(`./data/${id}.yml`);
					if (!(await file.exists())) {
						return {
							content: [{ type: "text", text: "ファイルが存在しません" }],
						};
					}
					try {
						const parsed = CharacterSchema.parse(YAML.parse(await file.text()));
						const timeline = simulate(parsed);
						return {
							content: [{ type: "text", text: JSON.stringify(timeline) }],
						};
					} catch (e) {
						return { content: [{ type: "text", text: `エラー: ${e}` }] };
					}
				},
			),
		],
	});
}

async function run(prompt: string, id: string) {
	const stream = query({
		prompt,
		options: {
			model: "claude-haiku-4-5",
			settingSources: ["project"],
			allowedTools: [
				"Read",
				"Edit",
				"Write",
				"Glob",
				"Grep",
				"WebSearch",
				"WebFetch",
			],
			mcpServers: { kirara: createKiraraTools(id) },
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

export async function generate(id: string, name: string) {
	const prompt = `
  あなたは優秀な脚本家です。${name}というキャラクターの行動を設計し、./data/${id}.ymlに保存してください。
  Kirara SKILLに詳しい手順・規約があります。
  大まかな行動基準として、メンションされたら即答・たまに話題を検索して投稿・自分が話しかけた後・話しかけられた後は積極的にチェック、みたいな方向をベースにしてください。
  ファイルには必ず相対パスでアクセスしてください。
  `;

	await run(prompt, id);
}

export async function refresh(id: string, name: string) {
	const prompt = `
  現在時刻は${Date.now().toLocaleString()}です。

  あなたは優秀な脚本家です。${name}の行動を内省し、必要であれば改善して./data/${id}.ymlに保存してください。

  ## 参照ファイル
  - 現在の設定: ./data/${id}.yml
  - 過去の記憶: ./data/memory/${id}/

  ## 改善観点
  以下を確認し、改善が必要な場合のみ更新してください。

  1. イベントログの行動パターンは${name}の性格と一致しているか
  2. 行動の頻度・タイミングは人間のインターネット上のアクティビティとして自然か
  3. ${name}の行動基準を変えるような経験が記憶に残っているか

  ## 注意
  ログが少ない・改善不要であれば更新しなくてよい。
  ファイルには必ず相対パスでアクセスしてください。
  `;

	await run(prompt, id);
}
