import type { Action } from "../action";
import type { MessageType } from "../schema";
import type { Transport } from "../transport";

export class Agent {
	private memory: string;
	private transport: Transport;

	constructor(transport: Transport, actions: Action[]) {
		this.memory = "記憶はありません。新たに会話を始めましょう。\n";
		this.transport = transport;
		transport.observe((msg) => {
			this.memory += `${msg.content}\n`;
			actions.forEach((action) => {
				if (
					msg.type === action.observeTarget ||
					action.observeTarget === "any"
				) {
					if (msg.importance >= action.minImportance) {
						this.output(action, msg);
					}
				}
			});
		});
	}

	private async output(action: Action, msg: MessageType) {
		const res = await action.run(msg, this.memory);
		this.transport.send(res);
	}
}
