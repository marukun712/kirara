import z from "zod";
import type { Actor } from "./actor";
import type { Planner } from "./planner";

const PlanSchema = z.array(z.object({ time: z.string(), action: z.string() }));

export class AgentLoop {
	timer?: Timer;
	ctx: string = "";
	done: Set<string> = new Set<string>();
	parsed: z.infer<typeof PlanSchema> = [];

	planner: Planner;
	actor: Actor;

	constructor(planner: Planner, actor: Actor) {
		this.actor = actor;
		this.planner = planner;
		this.done.add("idle");
	}

	async load() {
		let file = Bun.file("./data/plan.json");
		if (!(await file.exists())) {
			await this.planner.update();
			file = Bun.file("./data/plan.json");
		}
		const json = await file.json();
		this.parsed = PlanSchema.parse(json).sort(
			(a, b) => new Date(a.time).getTime() - new Date(b.time).getTime(),
		);
	}

	start() {
		this.timer = setInterval(async () => {
			if (this.planner.isBusy()) return;

			// planをロードする
			await this.load();

			const now = Date.now();
			// 現在時刻より前のイベントを取得
			const previous = this.parsed.filter(
				(i) => new Date(i.time).getTime() <= now,
			);
			// 現在時刻より前の最新イベント
			const latest = previous.at(-1);

			// 現在のすべてのイベントが現在時刻より前のものだった場合
			if (previous.length === this.parsed.length) {
				await this.planner.update();
				return;
			}

			// イベントを実行
			if (!latest || this.done.has(latest.action)) return;
			console.log(latest.action, this.ctx);
			this.done.add(latest.action);
			await this.actor.act(latest.action, this.ctx);
			this.ctx = "";
		}, 1000);
	}
}
