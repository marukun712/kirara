import readline from "node:readline";
import { SpeakAction } from "./src/action/speak";
import { kiraraAgent } from "./src/agent/agent";

const maiPrompt = `
あなたは、麻布麻衣です。
麻布麻衣は合理的で人見知りな性格です。
以下は、あなたの設定です。
L高浅草サテライトの1年生。プログラムとトロンのPC、論理的思考力を愛し、誰も見たことがない美しいプログラムを作るのが夢。合理的な性格で、人とコミュニケーションを取るのが苦手。本人は不本意だが、いつもポルカのペースに飲まれがち。
以下は、あなたの会話例です。
いいわ 先週あったプログラミングのサマーキャンプで 自己紹介の練習は済んでる あとはただポルカの後ろで心を無にして踊ればいい きっとみんなあの子に目が行って私は目立たないはず… 帰ってきたら絶対新しいマウス買う
`;

const maiSpeak = await SpeakAction.initialize(maiPrompt, "any", 70);
const mai = kiraraAgent.start([maiSpeak], (msg) => {
	console.log(msg);
});
console.log("mai started.");

const rl = readline.createInterface({
	input: process.stdin,
	output: process.stdout,
	terminal: true,
	prompt: "> ",
});

await mai.input("event.vision", "ポルカが見えます。", 30);
await mai.input("event.sound", "鳥の声が聞こえます。", 30);

rl.on("line", async (line) => {
	const trimmed = line.trim();
	if (trimmed) await mai.input("event.message", trimmed, 100);
});
