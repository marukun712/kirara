import { spawn } from "node:child_process";
import Client from "voicevox-client";
import { getKana } from "./kana";

type TextToken = { type: "text"; value: string[] };
type LongToken = { type: "long"; value: number };
type StopToken = { type: "stop"; value: number };
type GlueToken = { type: "glue"; value: number };
type UpToken = { type: "up"; value: number };
type DownToken = { type: "down"; value: number };
type PauseToken = { type: "pause"; value: number };
type LaughToken = { type: "laugh"; value: number };
type StrongToken = { type: "strong"; value: JeffersonToken[] };
type SmallToken = { type: "small"; value: JeffersonToken[] };
type FastToken = { type: "fast"; value: JeffersonToken[] };
type SlowToken = { type: "slow"; value: JeffersonToken[] };
type BracketToken = { type: "bracket"; value: JeffersonToken[] };

export type JeffersonToken =
	| TextToken
	| LongToken
	| StopToken
	| GlueToken
	| UpToken
	| DownToken
	| PauseToken
	| LaughToken
	| SmallToken
	| StrongToken
	| FastToken
	| SlowToken
	| BracketToken;

type MoraData = {
	mora: string;
	long?: number;
	stop?: number;
	glue?: number;
	up?: number;
	down?: number;
	pause?: number;
	laugh?: number;
	small?: boolean;
	strong?: boolean;
	fast?: boolean;
	slow?: boolean;
	bracket?: boolean;
};

export class JeffersonParser {
	async parse(text: string) {
		const lines = text.trim().split("\n");
		const map = await Promise.all(
			lines.map(async (line) => {
				const content = line.split("]:")[1];
				if (!content) return null;
				const cleanedContent = content.replace(/\([^)]*\)/g, "");
				return {
					text: cleanedContent.replace(/[[\]().,?↑↓°_<>:h=\-/]/g, "").trim(),
					tokens: await this.tokenizeJefferson(content),
				};
			}),
		);
		return map.filter((line) => line !== null);
	}

	async tokenizeJefferson(text: string): Promise<JeffersonToken[]> {
		const tokens: JeffersonToken[] = [];
		let currentText = "";

		const pushText = async () => {
			if (currentText) {
				const moras = await getKana(currentText);
				tokens.push({ type: "text", value: moras });
				currentText = "";
			}
		};

		for (let i = 0; i < text.length; i++) {
			const char = text[i];

			if (char === ":") {
				await pushText();
				let count = 0;
				while (i < text.length && text[i] === ":") {
					count++;
					i++;
				}
				i--;
				tokens.push({ type: "long", value: count });
			} else if (char === "-") {
				await pushText();
				tokens.push({ type: "stop", value: 1 });
			} else if (char === "=") {
				await pushText();
				tokens.push({ type: "glue", value: 1 });
			} else if (char === ".") {
				await pushText();
				tokens.push({ type: "down", value: 1 });
			} else if (char === ",") {
				await pushText();
				tokens.push({ type: "down", value: 2 });
			} else if (char === "?") {
				await pushText();
				tokens.push({ type: "up", value: 5 });
			} else if (char === "↑") {
				await pushText();
				tokens.push({ type: "up", value: 8 });
			} else if (char === "↓") {
				await pushText();
				tokens.push({ type: "down", value: 8 });
			} else if (char === "(") {
				await pushText();
				let j = i + 1;
				let between = "";
				while (j < text.length && text[j] !== ")") {
					between += text[j];
					j++;
				}
				if (between === ".") {
					tokens.push({ type: "pause", value: 0.2 });
				} else if (Number(between)) {
					tokens.push({ type: "pause", value: Number(between) });
				} else if (between === "h") {
					tokens.push({ type: "laugh", value: between.length });
				}
				i = j;
			} else if (char === "°") {
				await pushText();
				let j = i + 1;
				let between = "";
				while (j < text.length && text[j] !== "°") {
					between += text[j];
					j++;
				}
				if (between) {
					tokens.push({
						type: "small",
						value: await this.tokenizeJefferson(between),
					});
				}
				i = j;
			} else if (char === "_") {
				await pushText();
				let j = i + 1;
				let between = "";
				while (j < text.length && text[j] !== "_") {
					between += text[j];
					j++;
				}
				if (between) {
					tokens.push({
						type: "strong",
						value: await this.tokenizeJefferson(between),
					});
				}
				i = j;
			} else if (char === "<") {
				await pushText();
				let j = i + 1;
				let between = "";
				while (j < text.length && text[j] !== ">") {
					between += text[j];
					j++;
				}
				if (between) {
					tokens.push({
						type: "fast",
						value: await this.tokenizeJefferson(between),
					});
				}
				i = j;
			} else if (char === ">") {
				await pushText();
				let j = i + 1;
				let between = "";
				while (j < text.length && text[j] !== "<") {
					between += text[j];
					j++;
				}
				if (between) {
					tokens.push({
						type: "slow",
						value: await this.tokenizeJefferson(between),
					});
				}
				i = j;
			} else if (char === "[") {
				await pushText();
				let j = i + 1;
				let between = "";
				while (j < text.length && text[j] !== "]") {
					between += text[j];
					j++;
				}
				if (between) {
					tokens.push({
						type: "bracket",
						value: await this.tokenizeJefferson(between),
					});
				}
				i = j;
			} else {
				currentText += char;
			}
		}

		await pushText();
		return tokens;
	}
}

function flatten(tokens: JeffersonToken[]): MoraData[] {
	const result: MoraData[] = [];

	tokens.forEach((token) => {
		if (token.type === "text") {
			token.value.forEach((mora) => {
				result.push({ mora });
			});
		} else if (token.type === "long") {
			const last = result.pop();
			if (last) {
				last.long = token.value;
				result.push(last);
			}
		} else if (token.type === "stop") {
			const last = result.pop();
			if (last) {
				last.stop = token.value;
				result.push(last);
			}
		} else if (token.type === "glue") {
			const last = result.pop();
			if (last) {
				last.glue = token.value;
				result.push(last);
			}
		} else if (token.type === "up") {
			const last = result.pop();
			if (last) {
				last.up = token.value;
				result.push(last);
			}
		} else if (token.type === "down") {
			const last = result.pop();
			if (last) {
				last.down = token.value;
				result.push(last);
			}
		} else if (token.type === "pause") {
			const last = result.pop();
			if (last) {
				last.pause = token.value;
				result.push(last);
			}
		} else if (token.type === "laugh") {
			const last = result.pop();
			if (last) {
				last.laugh = token.value;
				result.push(last);
			}
		} else if (token.type === "small") {
			const nested = flatten(token.value);
			nested.forEach((item) => {
				item.small = true;
				result.push(item);
			});
		} else if (token.type === "strong") {
			const nested = flatten(token.value);
			nested.forEach((item) => {
				item.strong = true;
				result.push(item);
			});
		} else if (token.type === "fast") {
			const nested = flatten(token.value);
			nested.forEach((item) => {
				item.fast = true;
				result.push(item);
			});
		} else if (token.type === "slow") {
			const nested = flatten(token.value);
			nested.forEach((item) => {
				item.slow = true;
				result.push(item);
			});
		}
	});

	return result;
}

const text = `
[kyoko]:昨日さ、私のスマホが勝手に踊り始めたんだよ。
[natsumi]:え、何言ってんの。
[kyoko]:マジで::。振動がずっと続いて、もう、_びりびり_してた(h)。
[aya]:ああ、それは通知の嵐ですわね。
[natsumi]:つまり誰かにLINE爆撃されてたってこと?
[kyoko]:そ、そう。でもさ、送ってきたのが- 
[[
[natsumi]:誰よ。
[kyoko]:母親(h)。
]]
[aya]:°あら°。
[natsumi]:_何件_?
[kyoko]:<ちょ、ちょっと待ってよ>。.h 数えてみたら:::(0.5)52件。
[aya]:五十二件? 夜間に?
[natsumi]:キチってる。お母さんマジでキチってる。
[kyoko]:内容がね、全部「晩ご飯何食べたい?」なの。
[natsumi]:それだけで?
[kyoko]:最後のやつだけ「返事しろ」だった。
[aya]:非常に母親らしい。
[natsumi]:普通に電話しろよ、その母親。
[kyoko]:私に言わないで(h)、お母さんに言ってよ。
[aya]:では明日、直接- 
[natsumi]:いや待てよ。なんで返事してなかったの、お前。
[kyoko]:ごめん、寝てた。
[natsumi]:やっぱり。
`;

const client = new Client("http://127.0.0.1:50021");
const parser = new JeffersonParser();
const result = await parser.parse(text);

const bufs: ArrayBuffer[] = [];

const play = async (buf: ArrayBuffer) => {
	await new Promise<void>((resolve) => {
		const p = spawn("ffplay", [
			"-autoexit",
			"-nodisp",
			"-loglevel",
			"quiet",
			"-",
		]);

		p.stdin.write(Buffer.from(buf));
		p.stdin.end();
		p.on("close", () => resolve());
	});
};

for (const line of result) {
	const query = await client.createAudioQuery(line.text, 107);
	const data = flatten(line.tokens);

	query.intonationScale = 1.3;
	query.speedScale = 1.15;

	let moraIndex = 0;
	query.accentPhrases.forEach((phrase) => {
		phrase.moras.forEach((mora, idx) => {
			if (moraIndex >= data.length) return;
			const d = data[moraIndex];
			if (!d) return;

			if (d.long) {
				mora.vowel_length += d.long * 0.1;
			}

			if (d.fast) {
				mora.vowel_length *= 0.45;
				if (mora.consonant_length !== undefined) {
					mora.consonant_length *= 0.65;
				}
			}

			if (d.slow) {
				mora.vowel_length *= 1.3;
				if (mora.consonant_length !== undefined) {
					mora.consonant_length *= 1.15;
				}
			}

			if (d.small) {
				mora.vowel_length = Math.max(0.05, mora.vowel_length * 0.65);
				mora.pitch -= 0.12;
			}

			if (d.strong) {
				if (mora.consonant_length !== undefined) {
					mora.consonant_length *= 2.0;
				}
				mora.vowel_length *= 1.4;
				mora.pitch += 0.25;
			}

			if (d.up) {
				mora.pitch += d.up * 0.11;
			}

			if (d.down) {
				mora.pitch -= d.down * 0.1;
			}

			if (d.pause) {
				mora.vowel_length += d.pause * 0.85;
			}

			if (idx === phrase.moras.length - 1) {
				mora.vowel_length *= 1.15;
			}

			moraIndex++;
		});

		if (phrase.pause_mora) {
			phrase.pause_mora.vowel_length *= 1.25;
		}
	});

	bufs.push(await query.synthesis(107));
}

for await (const buf of bufs) {
	await play(buf);
}
