import { Environment } from "@marcbachmann/cel-js";
import { config } from "../../../data/config/config.ts";
import type { Transitions } from "../schema/index.ts";
import type { ParameterValues } from "../types.ts";

export class TransitionEngine {
	private env: Environment;
	private config: Transitions;
	private params: ParameterValues;

	constructor(transitions: Transitions) {
		this.config = transitions;
		this.env = new Environment();
		this.env.registerVariable("event", "map");
		this.env.registerVariable("params", "map");

		this.params = {} as ParameterValues;
		for (const [name, def] of Object.entries(config.parameters)) {
			this.params[name as keyof ParameterValues] = def.initial;
		}
	}

	getParams(): ParameterValues {
		return { ...this.params };
	}

	processEvent(eventType: string, eventData: unknown): ParameterValues {
		const candidate = this.config.transitions.filter(
			(t) => t.event === eventType,
		);

		if (!candidate) {
			return this.params;
		}

		const updatedParams = { ...this.params };

		for (const transition of candidate) {
			try {
				const result = this.env.evaluate(transition.expression, {
					event: eventData,
					params: updatedParams,
				});

				const numResult = typeof result === "bigint" ? Number(result) : result;

				updatedParams[transition.parameter as keyof ParameterValues] = Math.min(
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

	updateRules(newTransitions: Transitions): void {
		this.config = newTransitions;
	}
}
