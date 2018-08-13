import * as WebSocket from 'ws';
import Node from './Node';

interface Sendable {
  resolve: () => void;
  reject: (e: Error) => void;
  data: Buffer | string;
}

export default class Connection {
  public readonly node: Node;
  public url: string;
  public options: WebSocket.ClientOptions;

  public ws!: WebSocket;
  public reconnectTimeout = 500;

  private _queue: Array<Sendable> = [];

  constructor(client: Node, url: string, options: WebSocket.ClientOptions = {}) {
    this.node = client;
    this.url = url;
    this.options = options;

    this.onOpen = this.onOpen.bind(this);
    this.onClose = this.onClose.bind(this);
    this.onMessage = this.onMessage.bind(this);
    this.onError = this.onError.bind(this);
    this._send = this._send.bind(this);

    this.connect();
  }

  public connect() {
    const headers = {
      Authorization: this.node.password,
      'Num-Shards': this.node.shardCount || 1,
      'User-Id': this.node.userID,
    };

    const ws = this.ws = new WebSocket(this.url, Object.assign({ headers }, this.options));

    ws.once('open', this.onOpen);
    ws.once('close', this.onClose);
    ws.once('error', this.onError);
    ws.on('message', this.onMessage);
  }

  public async onOpen() {
    this.reconnectTimeout = 500;
    return this._flush();
  }

  public onError(err?: any) {
    this.node.emit('error', err);
    this.onClose();
  }

  public async onClose() {
    if (this.ws) {
      this.ws.removeListener('open', this.onOpen);
      this.ws.removeListener('close', this.onClose);
      this.ws.removeListener('error', this.onError);
      this.ws.removeListener('message', this.onMessage);
    }

    await new Promise(r => setTimeout(r, this.reconnectTimeout *= 2));
    this.connect();
  }

  public onMessage(d: WebSocket.Data) {
    let buf: Buffer | string;

    if (Buffer.isBuffer(d)) buf = d;
    else if (Array.isArray(d)) buf = Buffer.concat(d);
    else if (d instanceof ArrayBuffer) buf = Buffer.from(d);
    else buf = d;

    const pk: any = JSON.parse(buf.toString());

    if (pk.guildId) this.node.players.get(pk.guildId).emit(pk.op, pk);
    this.node.emit(pk.op, pk);
  }

  public send(d: object): Promise<void> {
    const encoded = JSON.stringify(d);

    return new Promise((resolve, reject) => {
      const send = { resolve, reject, data: encoded };
      if (this.ws.readyState === WebSocket.OPEN) this._send(send);
      else this._queue.push(send);
    });
  }

  private async _flush() {
    await Promise.all(this._queue.map(this._send));
  }

  private _send({ resolve, reject, data }: Sendable) {
    this.ws.send(data, (err) => {
      if (err) reject(err);
      else resolve();
    });
  }
}
