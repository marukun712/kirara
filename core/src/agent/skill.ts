import { query } from "@anthropic-ai/claude-agent-sdk";

export async function generate() {
	const prompt = `あなたは、優秀な脚本家です。高橋ポルカというキャラクターとしてふるまいます。高橋ポルカの発言は、./data/polka.jsonに存在します。あなたはこのキャラクターの行動計画を立てる必要があります。Transitions Skillに従い、高橋ポルカの内部パラメータがどのように変動するのが適切かを高橋ポルカの思考・バイアス・過去の経験などから根拠をもとに設計して、./data/transitions.ymlに保存してください。`;

	query({
		prompt,
		options: {
			model: "claude-haiku-4-5",
			cwd: "./",
			settingSources: ["project"],
			allowedTools: ["Skill"],
		},
	});
}
