import BaseCluster from './base/Cluster';
import ClusterNode, { ClusterNodeOptions } from './ClusterNode';

export interface ClusterOptions {
  filter?: (node: ClusterNode, guildID: string) => boolean;
  send: (guildID: string, packet: any) => any;
  nodes?: ClusterNodeOptions[];
}

export default class Cluster extends BaseCluster {
  public filter: (node: ClusterNode, guildID: string) => boolean;
  public send: (guildID: string, packet: any) => any;

  constructor(options: ClusterOptions) {
    super(options.nodes);
    this.filter = options.filter || (() => true);
    this.send = options.send;
  }
}
