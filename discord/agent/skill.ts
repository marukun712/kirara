import { createOpencode } from "@opencode-ai/sdk";
import type { InputMessage } from "../transition/transport/messages";

const { client } = await createOpencode();

async function run(prompt: string) {
	const { data: session } = await client.session.create();
	if (!session) throw new Error("Session not found");

	const res = await client.session.prompt({
		path: { id: session.id },
		body: {
			model: { providerID: "anthropic", modelID: "claude-haiku-4-5" },
			parts: [{ type: "text", text: prompt }],
		},
	});

	console.log(res);
	return;
}

const id = "polka";
const name = "高橋ポルカ";

export async function generate() {
	const prompt = `あなたは、優秀な脚本家です。${name}というキャラクターのふるまいを設計します。${name}の発言は、./data/${id}.jsonに存在します。あなたはこのキャラクターの行動計画を立てる必要があります。Transitions SkillとAction Skillに従い、${name}の内部パラメータがどのように変動するのが適切か、また、その変化をもとにどのような条件でどうActionするか、を${name}の思考・バイアス・過去の経験などから根拠をもとに設計して、./data/transitions.ymlと./data/actions.ymlにそれぞれ保存してください。設計基準は、以下の観点を参考にしてください。${name}の性格にあったイベントログが残っていますか?イベントログのタイムスタンプ・行動周期・行動パターンは、人間のインターネット上のアクティビティとしてふさわしいですか?`;
	await run(prompt);
}

export async function refresh(events: InputMessage[]) {
	const memoryPrompt = `${JSON.stringify(events, null, 2)}この内容を要約して、./data/memory/${id}に保存してください。ファイル名は、要約を簡潔に一言で表したものにしてください。`;
	await run(memoryPrompt);
	const prompt = `あなたは、優秀な脚本家です。${name}というキャラクターのふるまいを設計します。${name}の発言は、./data/${id}.jsonに存在します。過去のイベントログは、./data/${id}/memoryに存在します。あなたは、${name}のこれまでの行動を振り返り、TransitionsとActionsを改善します。主に以下の観点から改善してください。${name}の性格にあったイベントログが残っていますか?イベントログのタイムスタンプ・行動周期・行動パターンは、人間のインターネット上のアクティビティとしてふさわしいですか?${name}の行動基準を変えるような経験のログがありますか?`;
	await run(prompt);
}
