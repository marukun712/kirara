import { SpeakAction } from "./action/speak";
import { kiraraAgent } from "./src/agent/agent";
import { WebSocketTransport } from "./transports/websocket";

const maiPrompt = `
あなたは、麻布麻衣です。
麻布麻衣は合理的で人見知りな性格です。
以下は、あなたの設定です。
L高浅草サテライトの1年生。プログラムとトロンのPC、論理的思考力を愛し、誰も見たことがない美しいプログラムを作るのが夢。合理的な性格で、人とコミュニケーションを取るのが苦手。本人は不本意だが、いつもポルカのペースに飲まれがち。
以下は、あなたの会話例です。
いいわ 先週あったプログラミングのサマーキャンプで 自己紹介の練習は済んでる あとはただポルカの後ろで心を無にして踊ればいい きっとみんなあの子に目が行って私は目立たないはず… 帰ってきたら絶対新しいマウス買う
`;

const polkaPrompt = `
あなたは、高橋ポルカです。
高橋ポルカは元気で明るくて難しいことを考えるのが苦手な性格です。
以下は、あなたの設定です。
L高浅草サテライトの1年生。明るく元気な性格で、嬉しくなると足が勝手に踊りだす。小さい頃から数学が大の苦手で、高校受験に失敗。ネット高校であるL高に入学し、スクールアイドルを見つけた。
以下は、あなたの会話例です。
翔音ちゃんが見せてくれた昔のスクールアイドルの動画の数々 もうすっっっっっごい！！！ かわいかった～！！ 興奮 鼻血でちゃう！！ あ 夏ってなんか鼻血出やすいよね。。。 ティッシュ持ってなくて焦るときあるけど 踊ってごまかすポルカです
`;

const _hanabi = `
あなたは、駒形花火です。
駒形花火は明るくしっかり者な性格です。
以下は、あなたの設定です。
L高浅草サテライトの1年生。浅草にある呉服屋の一人娘。将来は跡を継ぎ、事業を拡大させ、着物文化を世界に広めたいという野望を持っている。頭の中はいつも着物のことでいっぱい。仲見世のアイドルで、しっかり者の商売人気質。
以下は、あなたの会話例です。
明日の入学式に着ていく着物を選定中 どっちがいい？ 蝶に花のちりめん友禅で華やかにお嬢様風か、キリッと黒地に辻が花の訪問着で格調高くーーうーん、迷うわ！こうなったら運天の花札で決めちゃおう
`;

const ws = new WebSocket("ws://localhost:8080");

import readline from "node:readline";
import WebSocket from "ws";

ws.on("message", (data) => {
	try {
		console.log(data.toString());
	} catch (err) {
		console.error("Failed to parse WS message:", err);
	}
});

ws.on("close", () => {
	console.log("WS connection closed");
});

ws.on("open", async () => {
	const maiSpeak = await SpeakAction.initialize(maiPrompt, "any", 70);
	const maiWsTransport = new WebSocketTransport(ws);
	const mai = kiraraAgent.start([maiWsTransport], [maiSpeak]);
	console.log("mai started.");

	const polkaSpeak = await SpeakAction.initialize(polkaPrompt, "any", 70);
	const polkaWsTransport = new WebSocketTransport(ws);
	kiraraAgent.start([polkaWsTransport], [polkaSpeak]);
	console.log("polka started.");

	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
		terminal: true,
		prompt: "> ",
	});

	await mai.broadcast("event.vision", "ポルカが見えます。", 30);
	await mai.broadcast("event.sound", "鳥の声が聞こえます。", 30);

	rl.on("line", async (line) => {
		const trimmed = line.trim();
		if (trimmed) await mai.broadcast("event.message", trimmed, 100);
	});
});
