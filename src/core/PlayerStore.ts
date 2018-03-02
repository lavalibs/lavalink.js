import Player from './Player';
import Client from './Client';

export default class PlayerStore extends Map<string, Player> {
  public readonly client: Client;

  constructor(client: Client) {
    super();
    this.client = client;
  }

  public get(key: string): Player {
    let player = super.get(key);
    if (!player) {
      player = new Player(this.client, key);
      this.set(key, player);
    }

    return player;
  }
}
