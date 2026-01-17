import { spawn } from "node:child_process";
import Client from "voicevox-client";
import { getKana } from "./kana";

type TextToken = { type: "text"; value: string[] };
type LongToken = { type: "long"; value: number };
type UpToken = { type: "up"; value: number };
type DownToken = { type: "down"; value: number };
type StrongToken = { type: "strong"; value: JeffersonToken[] };
type SmallToken = { type: "small"; value: JeffersonToken[] };
type FastToken = { type: "fast"; value: JeffersonToken[] };
type SlowToken = { type: "slow"; value: JeffersonToken[] };
type GlueToken = { type: "glue"; value: boolean };
type PauseToken = { type: "pause"; value: number };
type BracketToken = { type: "bracket"; value: JeffersonToken[] };

export type JeffersonToken =
	| TextToken
	| LongToken
	| UpToken
	| DownToken
	| SmallToken
	| StrongToken
	| FastToken
	| SlowToken
	| GlueToken
	| PauseToken
	| BracketToken;

type MoraData = {
	mora?: string;
	long?: number;
	up?: number;
	down?: number;
	small?: boolean;
	strong?: boolean;
	fast?: boolean;
	slow?: boolean;
	glue?: boolean;
	pause?: number;
	bracket?: boolean;
};

export class JeffersonParser {
	async parse(text: string) {
		const lines = text.trim().split("\n");
		const map = await Promise.all(
			lines.map(async (line) => {
				const character = line.split("]:")[0];
				const content = line.split("]:")[1];
				if (!content) return null;
				const cleanedContent = content.replace(/\([^)]*\)/g, "");
				return {
					character: character,
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
			} else if (char === ",") {
				await pushText();
				tokens.push({ type: "down", value: 1 });
			} else if (char === "?") {
				await pushText();
				tokens.push({ type: "up", value: 2 });
			} else if (char === "↑") {
				await pushText();
				tokens.push({ type: "up", value: 3 });
			} else if (char === "↓") {
				await pushText();
				tokens.push({ type: "down", value: 3 });
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
						type: "fast",
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
						type: "slow",
						value: await this.tokenizeJefferson(between),
					});
				}
				i = j;
			} else if (char === "=") {
				await pushText();
				tokens.push({ type: "glue", value: true });
			} else if (char === "-") {
				await pushText();
				tokens.push({ type: "pause", value: 1 });
			} else if (char === ".") {
				await pushText();
				tokens.push({ type: "pause", value: 1 });
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
		} else if (token.type === "pause") {
			result.push({ pause: token.value });
		} else if (token.type === "glue") {
			result.push({ glue: token.value });
		} else if (token.type === "bracket") {
			const nested = flatten(token.value);
			nested.forEach((item) => {
				item.bracket = true;
				result.push(item);
			});
		}
	});

	return result;
}

export async function playConversation(text: string, enable = true) {
	const client = new Client("http://127.0.0.1:50021");
	const parser = new JeffersonParser();
	const result = await parser.parse(text);

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

	const bufs: { audio: ArrayBuffer; data: MoraData[] }[] = [];

	for (const line of result) {
		const data = flatten(line.tokens);

		let speaker: number;
		switch (`${line.character}]`) {
			case "[kyoko]":
				speaker = 107;
				break;
			case "[aya]":
				speaker = 102;
				break;
			case "[natsumi]":
				speaker = 90;
				break;
			default:
				speaker = 107;
		}

		const query = await client.createAudioQuery(line.text, speaker);
		query.intonationScale = 1.3;
		query.speedScale = 1.2;

		let dataIndex = 0;

		query.accentPhrases.forEach((phrase) => {
			phrase.moras.forEach((mora) => {
				if (!enable) return;
				while (dataIndex < data.length && !data[dataIndex]?.mora) {
					dataIndex++;
				}
				if (dataIndex >= data.length) return;
				const d = data[dataIndex];
				if (!d) return;
				if (d.long) mora.vowel_length += d.long * 0.05;
				if (d.fast) mora.vowel_length *= 0.85;
				if (d.slow) mora.vowel_length *= 1.5;
				if (d.small) {
					mora.vowel_length = Math.max(0.05, mora.vowel_length * 0.65);
					mora.pitch -= 0.25;
				}
				if (d.strong) {
					if (mora.consonant_length !== undefined) mora.consonant_length *= 2;
					mora.vowel_length *= 1.3;
				}
				if (d.up) mora.pitch += d.up * 0.07;
				if (d.down) mora.pitch -= d.down * 0.07;
				if (d.glue) phrase.pause_mora.vowel_length = 0;

				dataIndex++;
			});
		});

		bufs.push({
			audio: await query.synthesis(speaker),
			data,
		});
	}

	for (let i = 0; i < bufs.length; i++) {
		const buf = bufs[i];
		const next = bufs[i + 1];
		if (!buf) continue;
		const hasBracket = buf.data.some((d) => d.bracket);
		const nextBracket = next?.data.some((d) => d.bracket);
		if (hasBracket && next && nextBracket && enable) {
			await Promise.all([play(buf.audio), play(next.audio)]);
			i++;
		} else {
			await play(buf.audio);
		}
	}
}
