import BaseNode, { VoiceServerUpdate, VoiceStateUpdate } from '../base/Node';
import { Track } from './Http';
import { EventEmitter } from 'events';
import { deprecate } from 'util';

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
  TRACK_START = 'TrackStartEvent',
  TRACK_END = 'TrackEndEvent',
  TRACK_EXCEPTION = 'TrackExceptionEvent',
  TRACK_STUCK = 'TrackStuckEvent',
  WEBSOCKET_CLOSED = 'WebSocketClosedEvent',
}

export interface PlayerOptions {
  start?: number;
  end?: number;
  noReplace?: boolean;
  pause?: boolean;
}

export interface FilterOptions {
  volume?: number;
  equalizer?: EqualizerBand[];
  karaoke?: KaraokeOptions;
  timescale?: TimescaleOptions;
  tremolo?: FrequencyDepthOptions;
  vibrato?: FrequencyDepthOptions;
  rotation?: RotationOptions;
  distortion?: DistortionOptions;
  channelMix?: ChannelMixOptions;
  lowPass?: LowPassOptions;
}

export interface RotationOptions {
    rotationHz?: number;
}

export interface DistortionOptions {
    sinOffset?: number;
    sinScale?: number;
    cosOffset?: number;
    cosScale?: number;
    tanOffset?: number;
    tanScale?: number;
    offset?: number;
    scale?: number;
}

export interface ChannelMixOptions {
  leftToLeft: number;
  leftToRight: number;
  rightToLeft: number;
  rightToRight: number;
}

export interface LowPassOptions {
  smoothing: number;
}

export interface KaraokeOptions {
  level?: number;
  monoLevel?: number;
  filterBand?: number;
  filterWidth?: number;
}

export interface TimescaleOptions {
  speed?: number;
  pitch?: number;
  rate?: number;
}

export interface FrequencyDepthOptions {
  frequency?: number;
  depth?: number;
}

export interface EqualizerBand {
  band: number;
  gain: number;
}

export interface JoinOptions {
  mute?: boolean;
  deaf?: boolean;
}

export default class Player<T extends BaseNode = BaseNode> extends EventEmitter {
  public readonly node: T;
  public guildID: string;
  public status: Status = Status.INSTANTIATED;

  constructor(node: T, guildID: string) {
    super();
    this.node = node;
    this.guildID = guildID;

    this.on('event', (d) => {
      switch (d.type) {
        case EventType.TRACK_START:
          this.status = Status.PLAYING
          break;
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

  public async moveTo(node: BaseNode) {
    if (this.node === node) return;
    if (!this.voiceServer || !this.voiceState) throw new Error('no voice state/server data to move');

    await this.destroy();
    await Promise.all([
      node.voiceStateUpdate(this.voiceState),
      node.voiceServerUpdate(this.voiceServer),
    ]);
  }

  public leave() {
    return this.join(null);
  }

  public join(channel: string | null, { deaf = false, mute = false }: JoinOptions = {}) {
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

  public async play(track: string | Track, { start, end, noReplace, pause }: PlayerOptions = {}) {
    await this.send('play', {
      track: typeof track === 'object' ? track.track : track,
      startTime: start,
      endTime: end,
      noReplace,
      pause
    });

    this.status = Status.PLAYING;
  }

  public setVolume(vol: number) {
    return this.send('volume', { volume: vol });
  }

  public setEqualizer(bands: EqualizerBand[]) {
    return this.send('equalizer', { bands });
  }

  public setFilters(options: FilterOptions) {
    return this.send('filters', options);
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

Player.prototype.setVolume = deprecate(Player.prototype.setVolume, "Player#setVolume: use setFilters instead");

Player.prototype.setEqualizer = deprecate(Player.prototype.setEqualizer, "Player#setEqualizer: use setFilters instead");
