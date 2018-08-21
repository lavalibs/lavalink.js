import { request, IncomingMessage, IncomingHttpHeaders, STATUS_CODES } from 'http';
import { URL } from 'url';
import Node from './Node';

export class HTTPError extends Error {
  public readonly statusMessage!: string;
  public method: string;
  public statusCode: number;
  public headers: IncomingHttpHeaders;
  public path: string;
  constructor(httpMessage: IncomingMessage, method: string, url: URL) {
    super(`${httpMessage.statusCode} ${STATUS_CODES[httpMessage.statusCode as number]}`)
    Object.defineProperty(this, 'statusMessage', { enumerable: true, get: function () { return STATUS_CODES[httpMessage.statusCode as number]} })
    this.statusCode = httpMessage.statusCode as number;
    this.headers = httpMessage.headers;
    this.name = this.constructor.name;
    this.path = url.toString();
    this.method = method;
  }
}

export enum LoadType {
  TRACK_LOADED = 'TRACK_LOADED',
  PLAYLIST_LOADED = 'PLAYLIST_LOADED',
  SEARCH_RESULT = 'SEARCH_RESULT',
  NO_MATCHES = 'NO_MATCHES',
  LOAD_FAILED = 'LOAD_FAILED'
}

export interface TrackResponse {
 loadType: LoadType,
 playlistInfo: PlaylistInfo,
 tracks: Track[]
}

export interface PlaylistInfo {
  name?: string,
  selectedTrack?: number
}

export interface Track {
  track: string;
  info: {
    identifier: string;
    isSeekable: boolean;
    author: string;
    length: number;
    isStream: boolean;
    position: number;
    title: string;
    uri: string;
  };
}

export default class Http {
  public readonly node: Node;
  public input: string;
  public base?: string;

  constructor(node: Node, input: string, base?: string) {
    this.node = node;
    this.input = input;
    this.base = base;
  }

  public url() {
    return new URL(this.input, this.base);
  }

  public load(identifier: string): Promise<TrackResponse[]> {
    const url = this.url();
    url.pathname = '/loadtracks';
    url.search = `identifier=${identifier}`;

    return this._make('GET', url);
  }

  public decode(track: string): Promise<Track>;
  public decode(tracks: string[]): Promise<Track[]>;
  public decode(tracks: string | string[]): Promise<Track | Track[]> {
    const url = this.url();
    if (Array.isArray(tracks)) {
      url.pathname = '/decodetracks';
      return this._make('POST', url, Buffer.from(JSON.stringify(tracks)));
    } else {
      url.pathname = '/decodetrack';
      url.search = `track=${tracks}`;
      return this._make('GET', url);
    }
  }

  private async _make<T = any>(method: string, url: URL, data?: Buffer): Promise<T> {
    const message = await new Promise<IncomingMessage>((resolve) => {
      const req = request({
        method,
        hostname: url.hostname,
        port: url.port,
        protocol: url.protocol,
        path: url.pathname + url.search,
        headers: {
          Authorization: this.node.password,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
      }, resolve);

      if (data) req.write(data);
      req.end();
    });

    if (message.statusCode && message.statusCode >= 200 && message.statusCode < 300) {
      const chunks: Array<Buffer> = [];
      message.on('data', (chunk) => {
        if (typeof chunk === 'string') chunk = Buffer.from(chunk);
        chunks.push(chunk);
      });

      return new Promise<T>(resolve => {
        message.once('end', () => {
          const data = Buffer.concat(chunks);
          resolve(JSON.parse(data.toString()));
        });
      });
    }

    throw new HTTPError(message, method, url);
  }
}
