import Client, { VoiceServerUpdate } from './Client';

export default class Player {
  public readonly client: Client;
  public guildID: string;

  constructor(client: Client, guildID: string) {
    this.client = client;
    this.guildID = guildID;
  }

  public play(track: string, { start = 0, end = 0 }: { start?: number, end?: number } = {}) {
    return this.send('play', {
      track,
      startTime: start,
      endTime: end,
    });
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

  public stop() {
    return this.send('stop');
  }

  public voiceUpdate(sessionId: string, event: VoiceServerUpdate) {
    return this.send('voiceUpdate', {
      event,
      sessionId,
    });
  }

  public async send(op: string, d: any = {}) {
    const conn = await this.client.getConnection();
    return conn.send(Object.assign({
      op,
      guildId: this.guildID,
    }, d));
  }
}
