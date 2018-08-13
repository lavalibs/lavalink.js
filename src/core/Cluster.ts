import { NodeOptions } from './Node';
import ClusterNode from './ClusterNode';
import { EventEmitter } from 'events';

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
}
