import { EventEmitter } from 'events';
import * as WebSocket from 'ws';
import ClusterNode, { ClusterNodeOptions } from './ClusterNode';
import Player from './Player';

export default abstract class Cluster extends EventEmitter {
  public abstract send(guild: string, pk: any): Promise<any>;
  public readonly nodes: ClusterNode[] = [];

  public spawn(options: ClusterNodeOptions): ClusterNode;
  public spawn(options: ClusterNodeOptions[]): ClusterNode[];
  public spawn(options: ClusterNodeOptions | ClusterNodeOptions[]): ClusterNode | ClusterNode[] {
    if (Array.isArray(options)) return options.map(opt => this.spawn(opt));

    const node = new ClusterNode(this, options);
    this.nodes.push(node);
    return node;
  }

  public find(tag?: string): ClusterNode {
    // filter nodes for open ws connections and restrict to specified tag (if provided)
    const nodes = this.nodes.filter(node => {
      return node.connection && node.connection.ws.readyState === WebSocket.OPEN && (!tag || node.tags.has(tag));
    });

    if (!nodes.length) throw new Error('no nodes available for the specified tag');
    return nodes.sort((a, b) => { // sort by overall system cpu load
      if (!a.stats || !b.stats) return -1;
      return (a.stats.cpu ? a.stats.cpu.systemLoad / a.stats.cpu.cores : 0)
        - (b.stats.cpu ? b.stats.cpu.systemLoad / b.stats.cpu.cores : 0);
    })[0];
  }

  public has(guildID: string): boolean {
    return this.nodes.some(node => node.players.has(guildID));
  }

  public get(guildID: string): Player | undefined {
    for (const node of this.nodes) {
      const has = node.players.has(guildID); // need to use has since get will create a new player
      if (has) return node.players.get(guildID);
    }
  }
}
