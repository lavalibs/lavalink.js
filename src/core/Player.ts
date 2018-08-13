import Node, { VoiceServerUpdate, VoiceStateUpdate } from './Node';
import { Track } from './Http';
import { EventEmitter } from 'events';

export enum Status {
  INSTANTIATED,
  PLAYING,
  PAUSED,
  ENDED,
  ERRORED,
  STUCK
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
      if (d.type === 'TrackEndEvent') {
        if (d.reason !== 'REPLACED') this.status = Status.ENDED;
      } else if (d.type === 'TrackExceptionEvent') {
        this.status = Status.ERRORED
      } else {
        this.status = Status.STUCK;
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
    if (this.voiceServer && this.voiceState) {
      await this.destroy();

      await Promise.all([
        node.voiceStateUpdate(this.voiceState),
        node.voiceServerUpdate(this.voiceServer),
      ]);
    }
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

  public join(channel: string, { deaf = false, mute = false } = {}) {
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

  public async play(track: string | Track, { start = 0, end = 0 }: { start?: number, end?: number } = {}) {
    if (typeof track !== 'string') track = track.track;
    await this.send('play', {
      track,
      startTime: start,
      endTime: end,
    });

    this.status = Status.PLAYING;
  }

  public setVolume(vol: number) {
    return this.send('volume', { volume: vol });
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
    await this.send('destroy');
    this.status = Status.ENDED;
    this.node.players.delete(this.guildID);
  }

  public voiceUpdate(sessionId: string, event: VoiceServerUpdate) {
    return this.send('voiceUpdate', {
      event,
      sessionId,
    });
  }

  public send(op: string, d: any = {}) {
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
