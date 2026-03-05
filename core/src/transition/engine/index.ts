import { Environment } from "@marcbachmann/cel-js";
import type { Params, Transition } from "../../schema/index.ts";

export class TransitionEngine {
	private env: Environment;
	private transitions: Transition[];
	private params: Record<string, number>;

	constructor(transitions: Transition[], params: Params) {
		this.transitions = transitions;
		this.env = new Environment();
		this.env.registerVariable("event", "map");
		this.params = {};
		for (const [name, def] of Object.entries(params)) {
			this.params[name] = def.initial;
		}
		for (const key of Object.keys(params)) {
			this.env.registerVariable(key, "double");
		}
	}

	getParams() {
		return this.params;
	}

	processEvent(eventType: string, eventData: unknown) {
		const candidate = this.transitions.filter((t) => t.event === eventType);

		if (candidate.length === 0) {
			return this.params;
		}

		const updatedParams = { ...this.params };

		for (const transition of candidate) {
			try {
				console.log(eventData);
				const result = this.env.evaluate(transition.expression, {
					event: eventData,
					...updatedParams,
				});

				const numResult = typeof result === "bigint" ? Number(result) : result;

				updatedParams[transition.parameter] = Math.min(
					1.0,
					Math.max(0.0, numResult),
				);
			} catch (error) {
				console.error(error);
			}
		}

		this.params = updatedParams;
		return this.params;
	}

	updateRules(newTransitions: Transition[]): void {
		this.transitions = newTransitions;
	}
}
