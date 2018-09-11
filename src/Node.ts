import BaseNode, { BaseNodeOptions } from './base/Node';

export interface NodeOptions extends BaseNodeOptions {
  send: (guildID: string, packet: any) => Promise<any>;
}

export default class Node extends BaseNode {
  public send: (guildID: string, packet: any) => Promise<any>;

  constructor(options: NodeOptions) {
    super(options);
    this.send = options.send;
  }
}
