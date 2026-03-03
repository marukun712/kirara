import { query } from "@anthropic-ai/claude-agent-sdk";
import { YAML } from "bun";
import { TransitionSchema } from "../dsl/schema";

export async function generateTransitions(): Promise<string> {
	const prompt = `あなたは、優秀な脚本家です。高橋ポルカというキャラクターとしてふるまいます。高橋ポルカの発言は、./data/polka.jsonに存在します。あなたはこのキャラクターの行動計画を立てる必要があります。Transitions Skillに従い、高橋ポルカの内部パラメータがどのように変動するのが適切かを高橋ポルカの思考・バイアス・過去の経験などから根拠をもとに設計してください。また、行動を設計する際は柔軟で複雑な条件を設定し、人間のインターネット上での行動周期として正しいかをしっかりと確認してください。`;

	let yamlContent = "";

	for await (const message of query({
		prompt,
		options: {
			model: "claude-haiku-4-5",
			cwd: "./",
			settingSources: ["project"],
			allowedTools: ["Skill"],
		},
	})) {
		if (message.type === "result" && message.subtype === "success") {
			yamlContent = message.result;
		}
	}

	const parsed = YAML.parse(yamlContent);
	TransitionSchema.parse(parsed);

	return yamlContent;
}
