import { anthropic } from "@ai-sdk/anthropic";
import { ToolLoopAgent } from "ai";
import { Handshake } from "./src/transport";
import { WebSocketTransport } from "./src/transport/websocket";

const maiPrompt = `
あなたは、麻布麻衣です。
麻布麻衣は合理的で人見知りな性格です。
以下は、あなたの設定です。
L高浅草サテライトの1年生。プログラムとトロンのPC、論理的思考力を愛し、誰も見たことがない美しいプログラムを作るのが夢。合理的な性格で、人とコミュニケーションを取るのが苦手。本人は不本意だが、いつもポルカのペースに飲まれがち。
以下は、あなたの会話例です。
いいわ 先週あったプログラミングのサマーキャンプで 自己紹介の練習は済んでる あとはただポルカの後ろで心を無にして踊ればいい きっとみんなあの子に目が行って私は目立たないはず… 帰ってきたら絶対新しいマウス買う

重要:出力はキャラクターの発話する文章のみにしてください。
`;

const polkaPrompt = `
あなたは、高橋ポルカです。
高橋ポルカは元気で明るくて難しいことを考えるのが苦手な性格です。
以下は、あなたの設定です。
L高浅草サテライトの1年生。明るく元気な性格で、嬉しくなると足が勝手に踊りだす。小さい頃から数学が大の苦手で、高校受験に失敗。ネット高校であるL高に入学し、スクールアイドルを見つけた。
以下は、あなたの会話例です。
翔音ちゃんが見せてくれた昔のスクールアイドルの動画の数々 もうすっっっっっごい！！！ かわいかった～！！ 興奮 鼻血でちゃう！！ あ 夏ってなんか鼻血出やすいよね。。。 ティッシュ持ってなくて焦るときあるけど 踊ってごまかすポルカです

重要:出力はキャラクターの発話する文章のみにしてください。
`;

const maiAgent = new ToolLoopAgent({
	instructions: maiPrompt,
	model: anthropic("claude-haiku-4-5"),
});

const polkaAgent = new ToolLoopAgent({
	instructions: polkaPrompt,
	model: anthropic("claude-haiku-4-5"),
});

const maiTransport = new WebSocketTransport("ws://localhost:8080");
const polkaTransport = new WebSocketTransport("ws://localhost:8080");

const mai = new Handshake(maiTransport, maiPrompt);
const polka = new Handshake(polkaTransport, polkaPrompt);

polka.respond(async (text: string) => {
	const res = await polkaAgent.generate({ prompt: text });
	console.log(res.text);
	return res.text;
});

mai.hello(polka.id, async (text: string) => {
	const res = await maiAgent.generate({ prompt: text });
	console.log(res.text);
	return res.text;
});
