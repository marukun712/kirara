import { Environment } from "@marcbachmann/cel-js";
import { config } from "../../data/config/config.ts";
import type { YAMLDSL } from "../dsl/schema.ts";
import type { ParameterValues } from "../types.ts";

export class StateMachineEngine {
	private env: Environment;
	private rules: YAMLDSL;
	private params: ParameterValues;

	constructor(rules: YAMLDSL) {
		this.rules = rules;
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
		const eventRules = this.rules.rules[eventType];
		if (!eventRules) {
			return this.params;
		}

		const updatedParams = { ...this.params };

		for (const rule of eventRules) {
			try {
				const result = this.env.evaluate(rule.expression, {
					event: eventData,
					params: updatedParams,
				});

				const numResult = typeof result === "bigint" ? Number(result) : result;

				updatedParams[rule.parameter as keyof ParameterValues] = Math.min(
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

	updateRules(newRules: YAMLDSL): void {
		this.rules = newRules;
	}
}
