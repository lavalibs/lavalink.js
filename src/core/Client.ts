import * as WebSocket from 'ws';
import Connection from './Connection';
import Player from './Player';
import { EventEmitter } from 'events';

export interface VoiceStateUpdate {
  guild_id: string;
  channel_id: string;
  user_id: string;
  session_id: string;
  deaf: boolean;
  mute: boolean;
  self_deaf: boolean;
  self_mute: boolean;
  suppress: boolean;
}

export interface VoiceServerUpdate {
  guild_id: string;
  token: string;
  endpoint: string;
}

export interface ClientOptions {
  password: string;
  shards: number;
  userID: string;
}

export default class Client extends EventEmitter {
  public password: string;
  public shards: number;
  public userID: string;

  public connections: Connection[] = [];
  public players: Map<string, Player> = new Map();

  public voiceStates: Map<string, string> = new Map();
  public voiceServers: Map<string, VoiceServerUpdate> = new Map();

  constructor({ password, shards, userID }: ClientOptions) {
    super();
    this.password = password;
    this.shards = shards;
    this.userID = userID;
  }

  public getConnection(timeout: number = 1e3): Promise<Connection> {
    return new Promise<Connection>(r => {
      const scan = () => {
        for (const conn of this.connections) {
          if (conn.ws && conn.ws.readyState === WebSocket.OPEN) {
            r(conn);
            return;
          }
        }

        setTimeout(scan, timeout);
      };

      scan();
    });
  }

  public connect(...urls: string[]) {
    return Promise.all(urls.map(async u => {
      const conn = new Connection(this, u);
      await conn.connect();
      return conn;
    }));
  }

  public voiceStateUpdate(packet: VoiceStateUpdate) {
    if (packet.user_id !== this.userID) return Promise.resolve(false);

    this.voiceStates.set(packet.guild_id, packet.session_id);
    return this._tryConnection(packet.guild_id);
  }

  public voiceServerUpdate(packet: VoiceServerUpdate) {
    this.voiceServers.set(packet.guild_id, packet);
    return this._tryConnection(packet.guild_id);
  }

  private async _tryConnection(guildID: string) {
    const state = this.voiceStates.get(guildID);
    const server = this.voiceServers.get(guildID);
    if (!state || !server) return false;

    // this.voiceServers.delete(guildID);

    let player = this.players.get(guildID);
    if (!player) {
      player = new Player(this, guildID);
      this.players.set(guildID, player);
    }

    await player.voiceUpdate(state, server);
    return true;
  }
}
