import Http from './Http';

export type RoutePlannerStatus = RotatingIpRoutePlanner | NanoIpRoutePlanner | RotatingIpRoutePlanner;

export interface BaseRoutePlannerStatusDetails {
	ipBlock: {
		type: string;
		size: string;
	};
	failingAddresses: {
		address: string;
		failingTimestamp: number;
		failingTime: string;
	}[];
}

export interface RotatingIpRoutePlanner {
	class: 'RotatingIpRoutePlanner';
	details: BaseRoutePlannerStatusDetails & {
		rotateIndex: string;
		ipIndex: string;
		currentAddress: string;
	};
}

export interface NanoIpRoutePlanner {
	class: 'NanoIpRoutePlanner';
	details: BaseRoutePlannerStatusDetails & {
		currentAddressIndex: number;
	};
}

export interface RotatingNanoIpRoutePlanner {
	class: 'RotatingNanoIpRoutePlanner';
	details: BaseRoutePlannerStatusDetails & {
		blockIndex: string;
		currentAddressIndex: number;
	};
}

export default class RoutePlanner {
	constructor(public readonly http: Http) {}

	public status(): Promise<RoutePlannerStatus> {
		const url = this.http.url();
		url.pathname = '/routeplanner/status';
		return this.http.do('get', url);
	}

	public unmark(address?: string): Promise<void> {
		const url = this.http.url();
		if (address) {
			url.pathname = '/routeplanner/free/address';
			return this.http.do('post', url, Buffer.from(JSON.stringify({ address })));
		}

		url.pathname = '/routeplanner/free/all';
		return this.http.do('post', url);
	}
}
