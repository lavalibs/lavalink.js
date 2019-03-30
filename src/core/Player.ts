import Node, { VoiceServerUpdate, VoiceStateUpdate } from '../base/Node';
import { Track } from './Http';
import { EventEmitter } from 'events';

export enum Status {
  INSTANTIATED,
  PLAYING,
  PAUSED,
  ENDED,
  ERRORED,
  STUCK,
  UNKNOWN,
}

export enum EventType {
  TRACK_END = 'TrackEndEvent',
  TRACK_EXCEPTION = 'TrackExceptionEvent',
  TRACK_STUCK = 'TrackStuckEvent',
  WEBSOCKET_CLOSED = 'WebSocketClosedEvent',
}

export interface PlayerOptions {
  start?: number;
  end?: number;
  noReplace?: boolean;
}

export interface EqualizerBand {
  band: number;
  gain: number;
}

export interface JoinOptions {
  mute?: boolean;
  deaf?: boolean;
}

export default class Player extends EventEmitter {
  public readonly node: Node;
  public guildID: string;
  public status: Status = Status.INSTANTIATED;

  constructor(node: Node, guildID: string) {
    super();
    this.node = node;
    this.guildID = guildID;

    this.on('event', (d) => {
      switch (d.type) {
        case EventType.TRACK_END:
          if (d.reason !== 'REPLACED') this.status = Status.ENDED;
          break;
        case EventType.TRACK_EXCEPTION:
          this.status = Status.ERRORED;
          break;
        case EventType.TRACK_STUCK:
          this.status = Status.STUCK;
          break;
        case EventType.WEBSOCKET_CLOSED:
          this.status = Status.ENDED;
          break;
        default:
          this.status = Status.UNKNOWN;
          break;
      }
    });
  }

  public get playing(): boolean {
    return this.status === Status.PLAYING;
  }

  public get paused(): boolean {
    return this.status === Status.PAUSED;
  }

  public get voiceState(): VoiceStateUpdate | undefined {
    const session = this.node.voiceStates.get(this.guildID);
    if (!session) return;

    return {
      guild_id: this.guildID,
      user_id: this.node.userID,
      session_id: session,
    };
  }

  public get voiceServer(): VoiceServerUpdate | undefined {
    return this.node.voiceServers.get(this.guildID);
  }

  public async moveTo(node: Node) {
    if (this.node === node) return;
    if (!this.voiceServer || !this.voiceState) throw new Error('no voice state/server data to move');

    await this.destroy();
    await Promise.all([
      node.voiceStateUpdate(this.voiceState),
      node.voiceServerUpdate(this.voiceServer),
    ]);
  }

  public leave() {
    return this.node.send(this.guildID, {
      op: 4,
      d: {
        guild_id: this.guildID,
        channel_id: null,
        self_mute: false,
        self_deaf: false
      },
    });
  }

  public join(channel: string, { deaf = false, mute = false }: JoinOptions = {}) {
    this.node.voiceServers.delete(this.guildID);
    this.node.voiceStates.delete(this.guildID);

    return this.node.send(this.guildID, {
      op: 4,
      d: {
        guild_id: this.guildID,
        channel_id: channel,
        self_deaf: deaf,
        self_mute: mute,
      },
    })
  }

  public async play(track: string | Track, { start = 0, end = 0, noReplace }: PlayerOptions = {}) {
    await this.send('play', {
      track: typeof track === 'object' ? track.track : track,
      startTime: start,
      endTime: end,
      noReplace,
    });

    this.status = Status.PLAYING;
  }

  public setVolume(vol: number) {
    return this.send('volume', { volume: vol });
  }

  public setEqualizer(bands: EqualizerBand[]) {
    return this.send('equalizer', { bands });
  }

  public seek(position: number) {
    return this.send('seek', { position });
  }

  public async pause(paused: boolean = true) {
    await this.send('pause', { pause: paused });

    if (paused) this.status = Status.PAUSED;
    else this.status = Status.PLAYING;
  }

  public async stop() {
    await this.send('stop');
    this.status = Status.ENDED;
  }

  public async destroy() {
    if (this.node.connected) await this.send('destroy');
    this.status = Status.ENDED;
    this.node.players.delete(this.guildID);
  }

  public voiceUpdate(sessionId: string, event: VoiceServerUpdate) {
    return this.send('voiceUpdate', {
      event,
      sessionId,
    });
  }

  public send(op: string, d: object = {}) {
    const conn = this.node.connection;
    if (conn) {
      return conn.send(Object.assign({
        op,
        guildId: this.guildID,
      }, d));
    } else {
      return Promise.reject(new Error('no WebSocket connection available'));
    }
  }
}
