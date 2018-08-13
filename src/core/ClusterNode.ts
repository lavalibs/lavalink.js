import Node, { NodeOptions } from './Node';
import Cluster from './Cluster';

export interface Stats {
  players: number;
  playingPlayers: number;
  uptime: number;
  memory?: {
    free: number;
    used: number;
    allocated: number;
    reservable: number;
  };
  cpu?: {
    cores: number;
    systemLoad: number;
    lavalinkLoad: number;
  };
  frameStats?: {
    sent: number;
    nulled: number;
    deficit: number;
  };
}

export enum Region {
  BRAZIL,
  EU_CENTRAL,
  EU_WEST,
  HONGKONG,
  JAPAN,
  RUSSIA,
  SINGAPORE,
  SOUTH_AFRICA,
  SYDNEY,
  US_CENTRAL,
  US_EAST,
  US_SOUTH,
  US_WEST,
}

export default class ClusterNode extends Node {
  public regions: Region[] = [];
  public stats?: Stats;

  constructor(public readonly cluster: Cluster, options: NodeOptions) {
    super(options);
    this.on('stats', stats => this.stats = stats);
  }

  public emit(name: string | symbol, ...args: any[]): boolean {
    return super.emit(name, ...args) && this.cluster.emit(name, ...args);
  }

  public send(guildID: string, pk: any): Promise<any> {
    return this.cluster.send(guildID, pk);
  }
}
