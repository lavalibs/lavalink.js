import * as WebSocket from 'ws';
import backoff = require('backoff');
import Node from '../base/Node';

interface Sendable {
  resolve: () => void;
  reject: (e: Error) => void;
  data: Buffer | string;
}

interface Headers {
  Authorization: string;
  'Num-Shards': number;
  'User-Id': string;
  'Resume-Key'?: string;
}

export default class Connection {
  public readonly node: Node;
  public url: string;
  public options: WebSocket.ClientOptions;
  public resumeKey?: string;

  public ws!: WebSocket;
  public backoff: backoff.Backoff = backoff.exponential();
  public reconnectTimeout: number = 100; // TODO: remove in next major version

  private _listeners = {
    open: () => {
      this.backoff.reset();
      this.node.emit('open');
      this._flush()
        .then(() => this.configureResuming())
        .catch(e => this.node.emit('error', e));
    },
    close: (code: number, reason: string) => {
      this.node.emit('close', code, reason);
      this._reconnect();
    },
    message: (d: WebSocket.Data) => {
      let buf: Buffer | string;

      if (Buffer.isBuffer(d)) buf = d;
      else if (Array.isArray(d)) buf = Buffer.concat(d);
      else if (d instanceof ArrayBuffer) buf = Buffer.from(d);
      else buf = d;

      const pk: any = JSON.parse(buf.toString());
      if (pk.guildId && this.node.players.has(pk.guildId)) this.node.players.get(pk.guildId).emit(pk.op, pk);
      this.node.emit(pk.op, pk);
    },
    error: (err: any) => {
      this.node.emit('error', err);
      this._reconnect();
    },
  };

  private _queue: Array<Sendable> = [];

  constructor(client: Node, url: string, options: WebSocket.ClientOptions = {}) {
    this.node = client;
    this.url = url;
    this.options = options;

    this._send = this._send.bind(this);
    this.connect();

    this.backoff.on('ready', () => this.connect());
    this.backoff.on('backoff', (number, delay) => this.reconnectTimeout = delay);
  }

  public connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) this.ws.close();

    const headers: Headers = {
      Authorization: this.node.password,
      'Num-Shards': this.node.shardCount || 1,
      'User-Id': this.node.userID,
    };

    if (this.resumeKey) headers['Resume-Key'] = this.resumeKey;
    this.ws = new WebSocket(this.url, Object.assign({ headers }, this.options));
    this._registerWSEventListeners();
  }

  public configureResuming(timeout: number = 60, key: string = Math.random().toString(36)): Promise<void> {
    this.resumeKey = key;

    return this.send({
      op: 'configureResuming',
      key,
      timeout,
    });
  }

  public send(d: object): Promise<void> {
    return new Promise((resolve, reject) => {
      const encoded = JSON.stringify(d);
      const send = { resolve, reject, data: encoded };

      if (this.ws.readyState === WebSocket.OPEN) this._send(send);
      else this._queue.push(send);
    });
  }

  private async _reconnect() {
    if (this.ws.readyState === WebSocket.CLOSED) this.backoff.backoff();
  }

  private _registerWSEventListeners() {
    for (const [event, listener] of Object.entries(this._listeners)) {
      if (!this.ws.listeners(event).includes(listener)) this.ws.on(event, listener);
    }
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
