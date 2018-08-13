import Node, { NodeOptions } from './Node';
import Cluster from './Cluster';

export default class ClusterNode extends Node {
  constructor(public readonly cluster: Cluster, options: NodeOptions) {
    super(options);
  }

  public emit(name: string | symbol, ...args: any[]): boolean {
    return this.cluster.emit(name, ...args);
  }

  public send(guildID: string, pk: any): Promise<any> {
    return this.cluster.send(guildID, pk);
  }
}
