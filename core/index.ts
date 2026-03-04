import { YAML } from "bun";
import { TransitionEngine } from "./src/transition/engine/index.ts";
import { TransitionsSchema } from "./src/transition/schema/index.ts";

async function main() {
	const file = Bun.file("./data/transitions.yml");
	const text = await file.text();
	const parsed = TransitionsSchema.parse(YAML.parse(text));
	const _engine = new TransitionEngine(parsed);
}

main().catch(console.error);
