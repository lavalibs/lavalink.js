import * as WebSocket from 'ws';
import Connection from './Connection';
import Player from './Player';
import PlayerStore from './PlayerStore';
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
  userID: string;
}

export default abstract class Client extends EventEmitter {
  public abstract send(pk: any): Promise<any>;

  public password: string;
  public userID: string;

  public connection?: Connection;
  public players: PlayerStore = new PlayerStore(this);

  public voiceStates: Map<string, string> = new Map();
  public voiceServers: Map<string, VoiceServerUpdate> = new Map();

  constructor({ password, userID }: ClientOptions) {
    super();
    this.password = password;
    this.userID = userID;
  }

  public async connect(url: string, options?: WebSocket.ClientOptions) {
    const conn = this.connection = new Connection(this, url);
    await conn.connect();
    return conn;
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

    await this.players.get(guildID).voiceUpdate(state, server);
    return true;
  }
}
