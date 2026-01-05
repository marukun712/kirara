import type { ScanType } from "./schema/index";

export interface Transport {
	scan(): Promise<ScanType[]>;
	respond(): Promise<void>;
	connect(): Promise<void>;
	consume(): Promise<void>;
}
