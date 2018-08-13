import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import { NodeOptions } from './Node';
import ClusterNode, { Region } from './ClusterNode';

export type ClusterOptions = NodeOptions[];

export default abstract class Cluster extends EventEmitter {
  public abstract send(guild: string, pk: any): Promise<any>;
  public readonly nodes: ClusterNode[] = [];

  public spawn(options: NodeOptions): ClusterNode;
  public spawn(options: ClusterOptions): ClusterNode[];
  public spawn(options: ClusterOptions | NodeOptions): ClusterNode | ClusterNode[] {
    if (Array.isArray(options)) return options.map(opt => this.spawn(opt));

    const node = new ClusterNode(this, options);
    this.nodes.push(node);
    return node;
  }

  public find(region?: Region): ClusterNode {
    // filter nodes for open ws connections and restrict to specified region (if provided)
    const nodes = this.nodes.filter(node => {
      return node.connection && node.connection.ws.readyState === WebSocket.OPEN && (!region || node.regions.includes(region));
    });

    if (!nodes.length) throw new Error('no nodes available for the specified region');
    return nodes.sort((a, b) => { // sort by overall system cpu load
      if (!a.stats || !b.stats) return -1;
      return (a.stats.cpu ? a.stats.cpu.systemLoad / a.stats.cpu.cores : 0)
        - (b.stats.cpu ? b.stats.cpu.systemLoad / b.stats.cpu.cores : 0);
    })[0];
  }
}
