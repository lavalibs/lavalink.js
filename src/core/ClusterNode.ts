import Cluster from './Cluster';
import Node, { NodeOptions } from './Node';

export interface ClusterNodeOptions extends NodeOptions {
  tags?: Iterable<string>;
}

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

export default class ClusterNode extends Node {
  public tags: Set<string>;
  public stats?: Stats;

  constructor(public readonly cluster: Cluster, options: ClusterNodeOptions) {
    super(options);
    this.tags = new Set(options.tags || []);
    this.on('stats', stats => this.stats = stats);
  }

  public emit(name: string | symbol, ...args: any[]): boolean {
    return super.emit(name, ...args) && this.cluster.emit(name, ...args);
  }

  public send = (guildID: string, pk: object): Promise<any> => {
    return this.cluster.send(guildID, pk);
  }
}
