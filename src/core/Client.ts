import * as WebSocket from 'ws';
import Connection from './Connection';
import Player from './Player';
import PlayerStore from './PlayerStore';
import Http, { Track } from './Http';
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
  hosts?: {
    rest?: string;
    ws?: string;
  };
}

export default abstract class Client extends EventEmitter {
  public abstract send(guild: string, pk: any): Promise<any>;

  public password: string;
  public userID: string;

  public connection?: Connection;
  public players: PlayerStore = new PlayerStore(this);
  public http?: Http;

  public voiceStates: Map<string, string> = new Map();
  public voiceServers: Map<string, VoiceServerUpdate> = new Map();

  protected _wsHost?: string;

  constructor({ password, userID, hosts }: ClientOptions) {
    super();
    this.password = password;
    this.userID = userID;

    if (hosts && hosts.rest) this.http = new Http(this, hosts.rest);

    this.on('event', (d) => {
      if (['TrackExceptionEvent', 'TrackStuckEvent'].includes(d.type)) this.emit('error', d);
    });
  }

  public load(identifier: string) {
    if (this.http) return this.http.load(identifier);
    throw new Error('no available http module');
  }

  public decode(track: string): Promise<Track>;
  public decode(tracks: string[]): Promise<Track[]>;
  public decode(tracks: string | string[]): Promise<Track | Track[]> {
    if (this.http) return this.http.decode(tracks as any);
    throw new Error('no available http module');
  }

  public async connect(url?: string, options?: WebSocket.ClientOptions) {
    if (!url) {
      if (this._wsHost) url = this._wsHost;
      else throw new Error('no WebSocket URL provided');
    }

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
