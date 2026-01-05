import { anthropic } from "@ai-sdk/anthropic";
import { ToolLoopAgent } from "ai";
import type { Action } from "../action";
import type { MessageType } from "../schema";

export class SpeakAction implements Action {
	id: string;
	observeTarget: string;
	minImportance: number;

	agent: ToolLoopAgent;

	constructor(
		agent: ToolLoopAgent,
		observeTarget: string,
		minImportance: number,
	) {
		this.id = "speak";
		this.observeTarget = observeTarget;
		this.minImportance = minImportance;
		this.agent = agent;
	}

	static initialize(
		prompt: string,
		observeTarget: string,
		minImportance: number,
	) {
		const agent = new ToolLoopAgent({
			model: anthropic("claude-3-5-haiku-latest"),
			instructions: prompt,
		});
		return new SpeakAction(agent, observeTarget, minImportance);
	}

	async run(message: MessageType, memory: string): Promise<unknown> {
		const res = await this.agent.generate({
			prompt: `与えられたメッセージ:${message.content} 記憶:${memory} 次の発言を生成してください。発話文のみを生成してください。`,
		});
		return res.text;
	}
}
