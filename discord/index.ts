import { query } from "@anthropic-ai/claude-agent-sdk";

const schema = {
	type: "object",
	properties: {
		plan: {
			type: "array",
			items: {
				type: "object",
				properties: {
					time: { type: "number" },
					action: { type: "string" },
				},
				required: ["time", "action"],
			},
		},
	},
	required: ["plan"],
};

let finalObject: unknown;

for await (const event of query({
	prompt: `
  あなたは、優秀な脚本家です。
  ./data/CHARACTER.mdにあるキャラクターの1時間の行動計画を作成します。
  {
    time: スタート時からの秒数(number)
    action: "行動を簡潔に(string)"
  }
  必ず、何もしていない時間を含めて行動計画を作成してください。
  `,
	options: {
		allowedTools: ["Read", "WebFetch"],
		outputFormat: {
			type: "json_schema",
			schema,
		},
	},
})) {
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
			if ("result" in event && event.structured_output) {
				finalObject = event.structured_output;
			}
			console.log("[result]", event.subtype, event.total_cost_usd);
			break;
	}
}

console.log(finalObject);
