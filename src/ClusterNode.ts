import Cluster from './base/Cluster';
import BaseNode, { BaseNodeOptions } from './base/Node';

export interface ClusterNodeOptions extends BaseNodeOptions {
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

export default class ClusterNode extends BaseNode {
  public tags: Set<string>;
  public stats?: Stats;

  constructor(public readonly cluster: Cluster, options: ClusterNodeOptions) {
    super(options);
    this.tags = new Set(options.tags || []);
    this.on('stats', stats => this.stats = stats);
  }

  public emit(name: string | symbol, ...args: any[]): boolean {
    if (this.listenerCount(name)) super.emit(name, ...args);
    return this.cluster.emit(name, ...args);
  }

  public send = (guildID: string, pk: object): Promise<any> => this.cluster.send(guildID, pk);

  public async destroy(code?: number, data?: string): Promise<void> {
    await super.destroy(code, data);
    this.cluster.nodes.splice(this.cluster.nodes.indexOf(this), 1);
  }
}
