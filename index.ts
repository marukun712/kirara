import { anthropic } from "@ai-sdk/anthropic";
import { ToolLoopAgent } from "ai";
import { HandshakeAction, SpeakAction } from "./src/action";
import { kiraraAgent } from "./src/agent/agent";
import { Handshake } from "./src/transport";
import { WebSocketTransport } from "./src/transport/websocket";

const MODEL = anthropic("claude-3-5-haiku-latest");
const WS_ENDPOINT = "ws://localhost:8080";

type CharacterConfig = {
	name: string;
	prompt: string;
};

const characters = {
	mai: {
		name: "鬼塚冬毬",
		prompt: `
      あなたは、鬼塚冬毬です。
      # 設定
      鬼塚夏美の妹。常に効率的な行動を心がけていて、無駄なことが大嫌い。物事をシビアに分析しがちで、夢や希望など、実現することが難しいものに対しては冷淡な目で見てしまう所も。一方、姉である夏美のことが大好きで、夏美が夢中になっているスクールアイドル活動にも興味を示す。
      # 会話例
      無駄なことは苦手なので手短に済ませます。皆さん、初めまして。鬼塚冬毬といいます。Liella!の新たなメンバーです。得意なことは効率化、苦手なことは合理的でないことです。
      Liella!のメンバーになった以上、必ずスクールアイドルとして皆さんの期待にコミット出来るよう、メンバーや姉者と共にシナジーを高め合っていきたいと思っています。だからそんなに見つめないで下さい……。

      重要:出力はキャラクターの発話する短い文章のみにしてください。
    `,
	},
	polka: {
		name: "ウィーン・マルガレーテ",
		prompt: `
      あなたは、ウィーン・マルガレーテです。
      # 設定
      遠くオーストリアから日本に留学してきた女の子。9月に日本のインターナショナルスクールに入学し、ラブライブ！に出場。そのステージをきっかけに、4月より結ヶ丘女子高等学校に編入してきた。音楽センスに優れ、素晴らしい歌声の持ち主だが、負けん気が強すぎる所があり、周りと衝突することも。
      鬼塚冬毬が好きですが、ツンデレです。
      # 会話例
      なんで私がこんな所で自己紹介しなきゃいけないのよ。まあいいわ、特別に教えてあげる。私の名前はウィーン・マルガレーテ。
      小さい頃から歌の天才と言われていた私にとっては、Liella!もラブライブ！も通過点に過ぎないけれど、でも、スクールアイドルとして活動していくからには、聴く人みんなを感動させるつもりでいるわ。だから、みんなも感動したらちゃんと私に伝えてね。も、もちろん、感動するに決まっていると思うけど。

      重要:出力はキャラクターの発話する短い文章のみにしてください。
    `,
	},
};

function createCharacter(config: CharacterConfig) {
	const agent = new ToolLoopAgent({
		instructions: config.prompt,
		model: MODEL,
	});

	const transport = new WebSocketTransport(WS_ENDPOINT);
	const handshake = new Handshake(transport, config.prompt);

	const handShakeAction = new HandshakeAction(
		handshake,
		async (text: string) => {
			const res = await agent.generate({ prompt: text });
			console.log(`[${config.name}]`, res.text);
			return res.text;
		},
	);

	const speakAction = new SpeakAction(async (text: string) => {
		const res = await agent.generate({ prompt: text });
		console.log(`[${config.name}]`, res.text);
		return res.text;
	});

	const kirara = new kiraraAgent(config.prompt, [handShakeAction, speakAction]);
	kirara.attachTransport(transport);

	return kirara;
}

const agent1 = createCharacter(characters.mai);
const agent2 = createCharacter(characters.polka);

agent1.input("event.listen", "桜の木が爆発している音が聞こえます。", 50);
agent1.input("event.vision", "桜が見えます。", 100);
agent1.input("handshake.hello", agent2.id, 1);
