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

const client = new Client("http://127.0.0.1:50021");

type AudioQuery = {
	type: "query";
	value: {
		speaker: number;
		query: Awaited<ReturnType<typeof client.createAudioQuery>>;
	};
};

type Pause = {
	type: "pause";
	value: number;
};

type Glue = {
	type: "glue";
	value: boolean;
};

type Bracket = {
	type: "bracket";
	value: {
		speaker: number;
		query: Awaited<ReturnType<typeof client.createAudioQuery>>;
	};
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
				if (moras.length > 0) {
					tokens.push({ type: "text", value: moras });
				}
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
					tokens.push({ type: "pause", value: 200 });
				} else if (Number(between)) {
					tokens.push({ type: "pause", value: Number(between) * 1000 });
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
				tokens.push({ type: "pause", value: 500 });
			} else if (char === ".") {
				await pushText();
				tokens.push({ type: "pause", value: 300 });
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

const flattenToken = (data: JeffersonToken) => {
	const effects: string[] = [];
	let current: JeffersonToken = data;
	while (current.type !== "text") {
		effects.push(current.type);
		if (
			!current.value ||
			!Array.isArray(current.value) ||
			current.value.length === 0 ||
			!current.value[0]
		) {
			throw new Error("Invalid structure, expected nested value");
		}
		current = current.value[0];
	}
	return {
		text: current.value,
		effects,
	};
};

export async function playConversation(text: string) {
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

	const queries: (AudioQuery | Pause | Glue | Bracket)[] = [];

	for (const line of result) {
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
		for (const token of line.tokens) {
			console.log(JSON.stringify(token, null, 2));
			if (token.type === "text") {
				console.log("TEXT", token.value.join(""));
				const query = await client.createAudioQuery(
					token.value.join(""),
					speaker,
				);
				query.intonationScale = 1.3;
				query.speedScale = 1.2;
				queries.push({ type: "query", value: { speaker, query } });
			} else if (token.type === "long") {
				const last = queries.pop();
				if (last?.type === "query") {
					const lastPhrase =
						last?.value.query.accentPhrases[
							last.value.query.accentPhrases.length - 1
						];
					const lastMora = lastPhrase?.moras.pop();
					if (lastMora) {
						lastMora.vowel_length += token.value * 0.05;
						lastPhrase?.moras.push(lastMora);
						console.log("LONG", token.value);
						queries.push(last);
					}
				}
			} else if (token.type === "up") {
				const last = queries.pop();
				if (last?.type === "query") {
					const lastPhrase =
						last?.value.query.accentPhrases[
							last.value.query.accentPhrases.length - 1
						];
					const lastMora = lastPhrase?.moras.pop();
					if (lastMora) {
						lastMora.pitch += token.value * 0.07;
						lastPhrase?.moras.push(lastMora);
						console.log("UP", token.value);
						queries.push(last);
					}
				}
			} else if (token.type === "down") {
				const last = queries.pop();
				if (last?.type === "query") {
					const lastPhrase =
						last?.value.query.accentPhrases[
							last.value.query.accentPhrases.length - 1
						];
					const lastMora = lastPhrase?.moras.pop();
					if (lastMora) {
						lastMora.pitch -= token.value * 0.07;
						lastPhrase?.moras.push(lastMora);
						console.log("DOWN", token.value);
						queries.push(last);
					}
				}
			} else if (
				token.type === "small" ||
				token.type === "strong" ||
				token.type === "fast" ||
				token.type === "slow"
			) {
				const { text, effects } = flattenToken(token);
				const query = await client.createAudioQuery(text.join(""), speaker);
				query.intonationScale = 1.3;
				query.speedScale = 1.2;
				query.accentPhrases.forEach((phrase) => {
					phrase.moras.forEach((mora) => {
						effects.forEach((effect) => {
							if (effect === "small") {
								mora.vowel_length = Math.max(0.05, mora.vowel_length * 0.65);
								mora.pitch -= 0.25;
							} else if (effect === "strong") {
								if (mora.consonant_length !== undefined)
									mora.consonant_length *= 1.5;
								mora.vowel_length *= 1.1;
							} else if (effect === "fast") {
								mora.vowel_length *= 0.85;
							} else if (effect === "slow") {
								mora.vowel_length *= 1.3;
							}
						});
					});
				});
				console.log(effects, text.join(""));
				queries.push({ type: "query", value: { speaker, query } });
			} else if (token.type === "pause") {
				queries.push({ type: "pause", value: token.value });
				console.log("PAUSE", token.value);
			} else if (token.type === "glue") {
				queries.push({ type: "glue", value: token.value });
				console.log("GLUE", token.value);
			} else if (token.type === "bracket") {
				const child = token.value[0];
				if (!child) continue;
				const { text, effects } = flattenToken(child);
				const query = await client.createAudioQuery(text.join(""), speaker);
				query.intonationScale = 1.3;
				query.speedScale = 1.2;
				query.accentPhrases.forEach((phrase) => {
					phrase.moras.forEach((mora) => {
						effects.forEach((effect) => {
							if (effect === "small") {
								mora.vowel_length = Math.max(0.05, mora.vowel_length * 0.65);
								mora.pitch -= 0.25;
							} else if (effect === "strong") {
								if (mora.consonant_length !== undefined)
									mora.consonant_length *= 1.5;
								mora.vowel_length *= 1.1;
							} else if (effect === "fast") {
								mora.vowel_length *= 0.85;
							} else if (effect === "slow") {
								mora.vowel_length *= 1.3;
							}
						});
					});
				});
				queries.push({ type: "bracket", value: { speaker, query } });
				console.log("BRACKET", effects, text.join(""));
			}
		}
	}

	for await (const item of queries) {
		if (item.type === "query") {
			const buf = await item.value.query.synthesis(item.value.speaker);
			await play(buf);
		} else if (item.type === "pause") {
			await new Promise((resolve) => setTimeout(resolve, item.value));
		} else if (item.type === "bracket") {
			const startIndex = queries.indexOf(item);
			if (startIndex === -1) continue;
			let endIndex = startIndex + 1;
			while (
				endIndex < queries.length &&
				queries[endIndex]?.type !== "bracket"
			) {
				endIndex++;
			}
			const currentQuery = queries[startIndex];
			const nextQuery = queries[endIndex];
			if (currentQuery?.type === "bracket" && nextQuery?.type === "bracket") {
				const buf1 = await currentQuery.value.query.synthesis(
					currentQuery.value.speaker,
				);
				const buf2 = await nextQuery.value.query.synthesis(
					nextQuery.value.speaker,
				);
				await Promise.all([play(buf1), play(buf2)]);
			}
		}
	}
}

await playConversation(`
[kyoko]:あー.
[aya]:どうしたの?そんなに、消しゴム、見つめて.
[kyoko]:これさー、消しゴムって言うけどさ、使うと
[kyoko]:ゴム自体は、増えてない?
[natsumi]:[は::?]
[aya]:[え::?]
[kyoko]:だって、消すと、カスが出るじゃん↑._消してるのに、物質的には、増えてる気がする_.=
[aya]:=>あー!わかるかも::!<消しカス、集めると結構な量になるもんね.
[natsumi]:(.)減ってるから.本体.
[kyoko]:えー、でもさー-
[kyoko]:これを全部集めて、ギュッ↑てしたら、元の形に戻るのかな.
[natsumi]:戻んないよ。進めろよ、プリント.
[aya]:でも、もし戻ったら::(1)無限消しゴム?
[kyoko]:それだ:::!エコだね.
`);
