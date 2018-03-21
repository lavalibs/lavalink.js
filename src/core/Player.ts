import Client, { VoiceServerUpdate } from './Client';

export default class Player {
  public readonly client: Client;
  public guildID: string;
  public playing: boolean = false;

  constructor(client: Client, guildID: string) {
    this.client = client;
    this.guildID = guildID;
  }

  public join(channel: string, { deaf = true, mute = false }) {
    this.client.voiceServers.delete(this.guildID);
    this.client.voiceStates.delete(this.guildID);

    return this.client.send(this.guildID, {
      op: 4,
      d: {
        guild_id: this.guildID,
        channel_id: channel,
        self_deaf: deaf,
        self_mute: mute,
      },
    })
  }

  public async play(track: string, { start = 0, end = 0 }: { start?: number, end?: number } = {}) {
    await this.send('play', {
      track,
      startTime: start,
      endTime: end,
    });

    this.playing = true;
  }

  public setVolume(vol: number) {
    return this.send('volume', { volume: vol });
  }

  public seek(position: number) {
    return this.send('seek', { position });
  }

  public pause(paused: boolean = true) {
    return this.send('pause', { pause: paused });
  }

  public async stop() {
    await this.send('stop');
    this.playing = false;
  }

  public voiceUpdate(sessionId: string, event: VoiceServerUpdate) {
    return this.send('voiceUpdate', {
      event,
      sessionId,
    });
  }

  public send(op: string, d: any = {}) {
    const conn = this.client.connection;
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
