import { YAML } from "bun";
import { TransitionsSchema } from "../dsl/schema.ts";
import type { StateMachineEngine } from "../engine/index.ts";
import { generateTransitions } from "./skill.ts";

export class Scheduler {
	private intervalMs = 5 * 60 * 1000;
	private intervalId: Timer | null = null;

	constructor(private engine: StateMachineEngine) {}

	start(): void {
		this.intervalId = setInterval(() => {
			this.regenerate();
		}, this.intervalMs);
	}

	stop(): void {
		if (this.intervalId) {
			clearInterval(this.intervalId);
			this.intervalId = null;
		}
	}

	private async regenerate(): Promise<void> {
		try {
			const yamlContent = await generateTransitions();

			const parsed = YAML.parse(yamlContent);
			const validated = TransitionsSchema.parse(parsed);
			Bun.write("./data/transitions.yml", JSON.stringify(validated, null, 2));

			this.engine.updateRules(validated);
		} catch (error) {
			console.error(error);
		}
	}
}
