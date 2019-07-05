# Lavalink.js

[![Lavalink.js support server](https://discordapp.com/api/guilds/494948120103485440/embed.png)](https://discord.gg/jXSKeW5)

A JavaScript wrapper for the [Lavalink](https://github.com/Frederikam/Lavalink) audio client for Discord. Only supports Lavalink v3; use 0.7.x for Lavalink v2. For a queue implementation, check out [lavaqueue](https://github.com/appellation/lavaqueue).

## Getting started

```js
const { Node } = require('lavalink');

const voice = new Node({
  password: '', // your Lavalink password
  userID: '', // the user ID of your bot
  shardCount: 0, // the total number of shards that your bot is running (optional, useful if you're load balancing)
  hosts: {
    rest: '', // the http host of your lavalink instance (optional)
    ws: '', // the ws host of your lavalink instance (optional)
  },
  host: '', // a URL to your lavalink instance without protocol (optional, can be used instead of specifying hosts option)
  send(guildID, packet) {
    // send this packet to the gateway
    // you are responsible for properly serializing and encoding the packet for transmission
    return gateway.connections.get(Long.fromString(guildID).shiftRight(22).mod(this.shardCount)).send(packet);
  },
});
```

You must also forward pre-decoded `VOICE_STATE_UPDATE` and `VOICE_SERVER_UPDATE` packets to the library by calling the `voiceStateUpdate` and `voiceServerUpdate` methods respectively.

```js
gateway.on('VOICE_STATE_UPDATE', (shard, state) => voice.voiceStateUpdate(state)); // forward voice state updates
gateway.on('VOICE_SERVER_UPDATE', (shard, info) => voice.voiceServerUpdate(info)); // forward voice server updates
gateway.on('GUILD_CREATE', (shard, guild) => {
  for (const state of guild.voice_states) voice.voiceStateUpdate(state);
});
```

> All examples that use the `gateway` variable are based off of the [Spectacles Gateway](https://github.com/spec-tacles/gateway.js) API, but any gateway library can be used as long as you can send and receive raw data to/from the Discord API.

## Basic operation

Players are available in a map keyed by guild ID, and are always available: if no player has yet been generated for a guild, it will be created.

```js
const player = voice.players.get('a guild id');
```

Use the provided `Player#join(channelID)` method to join voice channels.

```js
await player.join('channel id');
```

Load a track and then pass it to the `Player#play` method to play something.

```js
const res = await voice.load('ytsearch:monstercat');
await player.play(res.tracks[0]);
```

Stop playback.

```js
await player.stop();
// or, to destroy the player entirely
await player.destroy();
```

### Events

The client and players are event emitters. Events will only get emitted on a player if the event has a guild ID. The client will always emit every event. Events are emitted with the name as the `op` property from the event; see the [lavalink implementation page](https://github.com/Frederikam/Lavalink/blob/master/IMPLEMENTATION.md#incoming-messages) for details on available events.

```js
voice.players.get('guild id').on('event', (d) => {
  console.log('track ended!', d);
});

voice.on('event', (d) => {
  console.log('track ended!', d);
});
```

## Clustering

```js
const { Cluster } = require('lavalink');

const cluster = new Cluster({
  nodes: [
    // node options here; see above
  ],
  send(guildID, packet) {
    // send to gateway; same as for single node usage
  },
  filter(node, guildID) { // optional
    // return a boolean indicating whether the given guild can be run on the given node
    // useful for limiting guilds to specific nodes (for instance, if you setup lavalink edge servers to minimize latency)
    // this must return true at least once for a given set of nodes, otherwise some methods may error
  },
});
```

When using a cluster, you can use the `Cluster#voiceStateUpdate` and `Cluster#voiceServerUpdate` methods to forward voice events (rather than those on `Node`), which will automatically route packets to the correct node.

Clusters have a `nodes` property which is an array of all connected nodes. See above documentation for details about how to use them. Clusters have a number of properties to make load balancing more convenient. For example, to get an array of nodes sorted by CPU load:

```js
const recommendedNodes = cluster.sort();
```

Additionally, nodes created as part of a cluster support a `tags: Set<string>` property, which can then be used in the above-mentioned `filter` method to easily separate guilds into specific nodes.

Clusters also have a shortcut method to avoid lengthy searches of all connected nodes for a specific player. `Cluster#get(guildID: string)` will return a player for a specified guild; if no player currently exists, it will create the player on the top recommended node.

```js
const player = cluster.get(guildID);
```

Players can be moved to a new node by calling the `Player#moveTo(node: Node)` method. Note that this will stop the player and *not* restart it; you must restart the player manually.

## Caveats

This library stores a minimum amount of state in memory that is required for it to be usable. This means that information such as node stats and player positions are not automatically tracked. In order to do so, you should listen to the event that provides the data and cache it yourself. See #15 for more information.

Additionally, this library does not currently support external caches to avoid unnecessary drag on the event loop. If you have a legitimate use case for this, feel free to open a discussion.

## Reference

See the [Lavalink reference](https://github.com/Frederikam/Lavalink/blob/master/IMPLEMENTATION.md) for details.

### `Player`

- *readonly* `node: Node`
- `guildID: string`
- `status: Status`
- *readonly* `playing: boolean`
- *readonly* `paused: boolean`
- *readonly* `voiceState: VoiceStateUpdate | undefined` - a partially reconstructed voice state update packet for this player
- *readonly* `voiceServer: VoiceServerUpdate | undefined` - the latest voice server update packet for this player
- `moveTo(node: Node): Promise<void>` - destroy the player and forward voice state to the specified node. *Warning:* will reject if no voice state data is available. The player must be manually restarted once it has moved.
- `play(track: string | Track, { start?: number, end?: number } = {}): Promise<void>`
- `setVolume(volume: number): Promise<void>`
- `setEqualizer(bands: Array<{ band: number, gain: number}>): Promise<void>`
- `seek(position: number): Promise<void>`
- `pause(paused = true): Promise<void>`
- `stop(): Promise<void>`
- `destroy(): Promise<void>`
- `join(channel: string, { deaf = false, mute = false } = {}): Promise<void>`

```ts
enum Status {
  INSTANTIATED,
  PLAYING,
  PAUSED,
  ENDED,
  ERRORED,
  STUCK
}
```

### `Node`

- `send(guildID: string, pk: object): Promise<void>`
- `players: PlayerStore`
- `voiceStates: Map<string, string>` - guild ID mapped to session ID
- `voiceServers: Map<string, VoiceServerUpdate>`
- `load(identifier: string): Promise<TrackResponse>`
- `decode(track: string | string[]): Promise<TrackResponse | TrackResponse[]>`
- `voiceStateUpdate(packet: VoiceStateUpdate): Promise<boolean>`
- `voiceServerUpdate(packet: VoiceServerUpdate): Promise<boolean>`
- `voiceStates: Map<string, string>`
- `voiceServers: Map<string, VoiceServerUpdate>`
- `connection?: Connection`
- `http?: Http`
- `password: string`
- `userID: string`
- `shardCount?: number`

```ts
interface VoiceStateUpdate {
  guild_id: string;
  channel_id?: string;
  user_id: string;
  session_id: string;
  deaf?: boolean;
  mute?: boolean;
  self_deaf?: boolean;
  self_mute?: boolean;
  suppress?: boolean;
}

interface VoiceServerUpdate {
  guild_id: string;
  token: string;
  endpoint: string;
}

interface NodeOptions {
  password: string;
  userID: string;
  shardCount?: number;
  hosts?: {
    rest?: string;
    ws?: string | { url: string, options: WebSocket.ClientOptions };
  };
  host?: string;
  send: (guild: string, pk: any) => Promise<any>;
}
```

### Http

- **`constructor(node: Node, input: string, base?: string)`**
- *readonly* `node: Node`
- `input: string` - passed to Node.js URL constructor
- `base?: string` - passed to Node.js URL constructor
- `url(): URL`
- `load(identifier: string): Promise<TrackResponse[]>`
- `decode(track: string): Promise<Track>`
- `decode(tracks: string[]): Promise<Track[]>`

```ts
enum LoadType {
  TRACK_LOADED = 'TRACK_LOADED',
  PLAYLIST_LOADED = 'PLAYLIST_LOADED',
  SEARCH_RESULT = 'SEARCH_RESULT',
  NO_MATCHES = 'NO_MATCHES',
  LOAD_FAILED = 'LOAD_FAILED'
}

interface TrackResponse {
  loadType: LoadType,
  playlistInfo: PlaylistInfo,
  tracks: Track[]
}

interface TrackResponse {
 loadType: LoadType,
 playlistInfo: PlaylistInfo,
 tracks: Track[]
}

interface PlaylistInfo {
  name?: string,
  selectedTrack?: number
}

interface Track {
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
```

### `Cluster`

- **`constructor(options: ClusterOptions)`**
- *readonly* `nodes: ClusterNode[]`
- `send(guildID: string, pk: object): Promise<any>`
- `filter(node: ClusterNode, guildID: string): boolean`
- `spawn(options: ClusterNodeOptions): ClusterNode`
- `spawn(options: ClusterNodeOptions[]): ClusterNode[]`
- `sort(): ClusterNode[]` - does *not* sort in place
- `getNode(guildID: string): Node` - throws if the node doesn't already exist and the filter never returns true
- `has(guildID: string): boolean`
- `get(guildID: string): Player`
- `voiceStateUpdate(state: VoiceStateUpdate): Promise<boolean>`
- `voiceServerUpdate(server: VoiceServerUpdate): Promise<boolean>`

```ts
interface ClusterOptions {
  send: (guildID: string, pk: object) => Promise<any>;
  filter?: (node: ClusterNode, guildID: string) => boolean;
  nodes?: ClusterNodeOptions;
}
```

### `ClusterNode extends Node`

- **`constructor(cluster: Cluster, options: ClusterNodeOptions)`**
- `tags: Set<string>`
- `stats?: Stats`

```ts
interface Stats {
  players: number;
  playingPlayers: number;
  uptime: number;
  memory?: {
    free: number;
    used: number;
    allocated: number;
    reservable: number;
  };
  cpu?: {
    cores: number;
    systemLoad: number;
    lavalinkLoad: number;
  };
  frameStats?: {
    sent: number;
    nulled: number;
    deficit: number;
  };
}

interface ClusterNodeOptions extends NodeOptions {
  tags?: Iterable<string>;
}
```

## Discord.js example

```js
const { Client } = require('discord.js');
const { Node } = require('lavalink');

const client = new Client();
const voice = new Node({
  // options here
  send(guildID, packet) {
    if (client.guilds.has(guildID)) return client.ws.send(packet);
    throw new Error('attempted to send a packet on the wrong shard');
  }
});

client.on('raw', pk => {
  if (pk.t === 'VOICE_STATE_UPDATE') voice.voiceStateUpdate(pk.d);
  if (pk.t === 'VOICE_SERVER_UPDATE') voice.voiceServerUpdate(pk.d);
});
```
