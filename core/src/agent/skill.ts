import { query } from "@anthropic-ai/claude-agent-sdk";

export async function generate() {
	const prompt = `あなたは、優秀な脚本家です。高橋ポルカというキャラクターのふるまいを設計します。高橋ポルカの発言は、./data/polka.jsonに存在します。あなたはこのキャラクターの行動計画を立てる必要があります。Transitions SkillとAction Skillに従い、高橋ポルカの内部パラメータがどのように変動するのが適切か、また、その変化をもとにどのような条件でどうActionするか、を高橋ポルカの思考・バイアス・過去の経験などから根拠をもとに設計して、./data/transitions.yml,./data/actions.ymlにそれぞれ保存してください。`;

	query({
		prompt,
		options: {
			model: "claude-haiku-4-5",
			cwd: "./",
			settingSources: ["project"],
			disallowedTools: ["Bash", "WebSearch", "WebFetch", "AskUserQuestion"],
		},
	});
}

export async function refresh() {
	const prompt = `あなたは、優秀な脚本家です。高橋ポルカというキャラクターのふるまいを設計します。高橋ポルカの発言は、./data/polka.jsonに存在します。あなたは、高橋ポルカのこれまでの行動を振り返り、TransitionsとActionsを改善します。主に以下の観点から改善してください。高橋ポルカの性格にあったイベントログが残っていますか?イベントログのタイムスタンプ・行動周期・行動パターンは、人間のインターネット上のアクティビティとしてふさわしいですか?高橋ポルカの行動基準を変えるような経験のログがありますか?`;

	query({
		prompt,
		options: {
			model: "claude-haiku-4-5",
			cwd: "./",
			settingSources: ["project"],
			disallowedTools: ["Bash", "WebSearch", "WebFetch", "AskUserQuestion"],
		},
	});
}
