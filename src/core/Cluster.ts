import { EventEmitter } from 'events';
import ClusterNode, { ClusterNodeOptions } from './ClusterNode';
import Player from './Player';
import { VoiceStateUpdate, VoiceServerUpdate } from './Node';

export interface ClusterOptions {
  send: (guildID: string, pk: object) => Promise<any>;
  filter?: (node: ClusterNode, guildID: string) => boolean;
  nodes?: ClusterNodeOptions;
}

export default class Cluster extends EventEmitter {
  public send: (guildID: string, pk: object) => Promise<any>;
  public filter: (node: ClusterNode, guildID: string) => boolean;
  public readonly nodes: ClusterNode[] = [];

  constructor(options: ClusterOptions) {
    super();
    this.send = options.send;
    this.filter = options.filter || (() => true);
    if (options.nodes) this.spawn(options.nodes);
  }

  public spawn(options: ClusterNodeOptions): ClusterNode;
  public spawn(options: ClusterNodeOptions[]): ClusterNode[];
  public spawn(options: ClusterNodeOptions | ClusterNodeOptions[]): ClusterNode | ClusterNode[] {
    if (Array.isArray(options)) return options.map(opt => this.spawn(opt));

    const node = new ClusterNode(this, options);
    this.nodes.push(node);
    return node;
  }

  public sort(): ClusterNode[] {
    // filter nodes for open ws connections and restrict to specified tag (if provided)
    return this.nodes.slice().sort((a, b) => { // sort by overall system cpu load
      if (!a.stats || !b.stats) return -1;
      return (a.stats.cpu ? a.stats.cpu.systemLoad / a.stats.cpu.cores : 0)
        - (b.stats.cpu ? b.stats.cpu.systemLoad / b.stats.cpu.cores : 0);
    });
  }

  public has(guildID: string): boolean {
    return this.nodes.some(node => node.players.has(guildID));
  }

  public get(guildID: string): Player {
    let node = this.nodes.find(node => node.players.has(guildID));
    if (!node) node = this.sort().find(node => this.filter(node, guildID));
    if (node) return node.players.get(guildID);
    throw new Error('unable to find appropriate node; please check your filter');
  }

  public voiceStateUpdate(state: VoiceStateUpdate): Promise<boolean> {
    return this.get(state.guild_id).node.voiceStateUpdate(state);
  }

  public voiceServerUpdate(server: VoiceServerUpdate): Promise<boolean> {
    return this.get(server.guild_id).node.voiceServerUpdate(server);
  }
}
