import * as WebSocket from 'ws';
import Client from './Client';

export default class Connection {
  public readonly client: Client;
  public url: string;
  public options: WebSocket.ClientOptions;

  public ws!: WebSocket;

  constructor(client: Client, url: string, options: WebSocket.ClientOptions = {}) {
    this.client = client;
    this.url = url;
    this.options = options;

    this.onClose = this.onClose.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onError = this.onError.bind(this);

    this.connect();
  }

  public connect() {
    const headers = {
      Authorization: this.client.password,
      'Num-Shards': 1,
      'User-Id': this.client.userID,
    };

    const ws = this.ws = new WebSocket(this.url, Object.assign({ headers }, this.options));

    ws.once('close', this.onClose);
    ws.once('error', this.onError);
    ws.on('message', this.onMessage);
  }

  public onError(err?: any) {
    this.client.emit('error', err);
    this.onClose();
  }

  public async onClose() {
    if (this.ws) {
      this.ws.removeListener('close', this.onClose);
      this.ws.removeListener('error', this.onError);
      this.ws.removeListener('message', this.onMessage);
    }

    await new Promise(r => setTimeout(r, 1e3 + Math.random() - 0.5));
    this.connect();
  }

  public onMessage(d: WebSocket.Data) {
    let buf: Buffer | string;

    if (Buffer.isBuffer(d)) buf = d;
    else if (Array.isArray(d)) buf = Buffer.concat(d);
    else if (d instanceof ArrayBuffer) buf = Buffer.from(d);
    else buf = d;

    const pk: any = JSON.parse(buf.toString());

    if (pk.guildId) this.client.players.get(pk.guildId).emit(pk.op, pk);
    this.client.emit(pk.op, pk);
  }

  public send(d: any): Promise<void> {
    return new Promise((resolve, reject) => {
      this.ws.send(JSON.stringify(d), (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
