import { query } from "@anthropic-ai/claude-agent-sdk";
import type { InputMessage } from "core/types";

async function run(prompt: string) {
	const stream = query({
		prompt,
		options: {
			settingSources: ["project"],
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
  `;

	await run(prompt);
}

export async function refresh(
	id: string,
	name: string,
	events: InputMessage[],
) {
	if (events.length !== 0) {
		const memoryPrompt = `
    以下のイベントログを要約し、./data/memory/${id}/に保存してください。
    ファイル名は内容を一言で表したものにしてください。
    ${JSON.stringify(events, null, 2)}
    `;
		await run(memoryPrompt);
	}

	const prompt = `
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
  `;

	await run(prompt);
}
