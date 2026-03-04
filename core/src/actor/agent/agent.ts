import { query } from "@anthropic-ai/claude-agent-sdk";
import { assign, createMachine, fromPromise } from "xstate";

type Params = {
	want_to_speak: number;
	web_attention: number;
	discord_attention: number;
	boredom: number;
};

type ActionType = "reply_discord" | "search_web" | "spontaneous" | "speak";

type Context = {
	params: Params;
	action: ActionType | null;
	pending: string[];
	sessionId: string | undefined;
	lastResponse: string | null;
};

const ACTION_DESC: Record<ActionType, string> = {
	reply_discord: "Discordのメッセージに直接返信する",
	search_web: "Webで何かを調べてから発言する",
	spontaneous: "誰にも促されず自発的に面白いことを言う",
	speak: "会話の流れに乗って自然に発言する",
};

const resolveAction = (p: Params): ActionType | null => {
	if (p.want_to_speak > 0.6 && p.discord_attention > 0.6)
		return "reply_discord";
	if (p.web_attention > 0.6) return "search_web";
	if (p.boredom > 0.7) return "spontaneous";
	if (p.want_to_speak > 0.65) return "speak";
	return null;
};

const callLLM = fromPromise(
	async ({
		input,
	}: {
		input: {
			pending: string[];
			sessionId: string | undefined;
			action: ActionType | null;
		};
	}) => {
		const actionDesc = ACTION_DESC[input.action ?? "speak"];
		const prompt = `
直近のメッセージ:
${input.pending.join("\n")}

現在の行動意図: ${actionDesc}

あなたは高橋ポルカというキャラクターです。./data/polka.jsonにキャラクター設定があります。
行動意図と会話の流れをふまえ、キャラクターのセリフのみを出力してください。
`;
		let result = "";
		let sessionId = input.sessionId;
		const options: Record<string, unknown> = {
			allowedTools: ["Read", "Glob", "Grep", "WebSearch"],
		};
		if (sessionId) options.resume = sessionId;

		for await (const message of query({ prompt, options })) {
			if (message.type === "system" && message.subtype === "init")
				sessionId = message.session_id;
			if ("result" in message) result = message.result ?? "";
		}
		return { text: result, sessionId };
	},
);

export const agentMachine = createMachine(
	{
		id: "agent",
		context: {
			params: {
				want_to_speak: 0,
				web_attention: 0,
				discord_attention: 0,
				boredom: 0,
			},
			action: null,
			pending: [],
			sessionId: undefined,
			lastResponse: null,
		} as Context,
		on: {
			CONTEXT_ADDED: { actions: "appendContext" },
			want_to_speak: { actions: "updateParam" },
			web_attention: { actions: "updateParam" },
			discord_attention: { actions: "updateParam" },
			boredom: { actions: "updateParam" },
			TICK: { actions: "decayParams" },
		},
		initial: "idle",
		states: {
			idle: {
				always: {
					guard: ({ context }) => resolveAction(context.params) !== null,
					target: "debouncing",
				},
			},
			debouncing: {
				always: {
					guard: ({ context }) => resolveAction(context.params) === null,
					target: "idle",
				},
				after: {
					DEBOUNCE: {
						guard: ({ context }) => resolveAction(context.params) !== null,
						target: "generating",
						actions: assign({
							action: ({ context }) => resolveAction(context.params),
						}),
					},
				},
			},
			generating: {
				invoke: {
					src: "callLLM",
					input: ({ context }) => ({
						pending: context.pending,
						sessionId: context.sessionId,
						action: context.action,
					}),
					onDone: {
						target: "cooldown",
						actions: assign({
							lastResponse: ({ event }) => event.output.text,
							sessionId: ({ event }) => event.output.sessionId,
							pending: [],
							action: null,
						}),
					},
					onError: {
						target: "idle",
						actions: assign({ pending: [], action: null }),
					},
				},
			},
			cooldown: {
				after: { COOLDOWN: "idle" },
			},
		},
	},
	{
		delays: {
			DEBOUNCE: 3000,
			COOLDOWN: 15000,
		},
		actions: {
			updateParam: assign({
				params: ({ context, event }) => ({
					...context.params,
					[event.type]: event.value,
				}),
			}),
			appendContext: assign({
				pending: ({ context, event }) =>
					event.type === "CONTEXT_ADDED"
						? [...context.pending, event.message]
						: context.pending,
			}),
		},
		actors: { callLLM },
	},
);
