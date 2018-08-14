import Player from './Player';
import Node from './Node';

export default class PlayerStore extends Map<string, Player> {
  public readonly node: Node;

  constructor(node: Node) {
    super();
    this.node = node;
  }

  public get(key: string): Player {
    let player = super.get(key);
    if (!player) {
      player = new Player(this.node, key);
      this.set(key, player);
    }

    return player;
  }
}
