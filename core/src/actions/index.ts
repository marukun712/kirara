import { Environment } from "@marcbachmann/cel-js";
import type { Action } from "../schema/index.ts";

export class ActionListener {
	private env: Environment;
	private actions: Action[];

	constructor(actions: Action[]) {
		this.actions = actions;
		this.env = new Environment();
		this.env.registerVariable("params", "map");
	}

	check(params: Record<string, number>): string[] {
		return this.actions
			.filter((a) => {
				try {
					return this.env.evaluate(a.expression, { params });
				} catch {
					return false;
				}
			})
			.map((a) => a.on);
	}
}
