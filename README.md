# Lavalink.js

[![Lavalink.js support server](https://discordapp.com/api/guilds/251245211416657931/embed.png)](https://discord.gg/DPuaDvP)

A Javascript wrapper for the [Lavalink](https://github.com/Frederikam/Lavalink) audio client for Discord. Only supports Lavalink v3; use 0.7.x for Lavalink v2. For a queue implementation, check out [lavaqueue](https://github.com/appellation/lavaqueue).

## Getting started

```js
const { Client } = require('lavalink');

const voice = new class extends Client {
  constructor() {
    super({
      password: '', // your Lavalink password
      userID: '', // the user ID of your bot
      shardCount: 0, // the total number of shards that your bot is running (optional, useful if you're load balancing)
      hosts: {
        rest: '', // the http host of your lavalink instance (optional)
        ws: '', // the ws host of your lavalink instance (optional)
      },
    });
  }

  send(guildID, packet) {
    // send this packet to the gateway
  }
};
```

You must extend the provided client with your own `send` method. You can do this by either modifying the client prototype or following the pattern above: either way, you must provide a method that sends packets to the gateway through the appropriate shard. You are responsible for properly encoding the packet for transmission.

```js
Client.prototype.send = function(guildID, packet) {
  gateway.connections.get(Long.fromString(guildID).shiftRight(22).mod(this.shardCount)).send(packet);
};
```

You must also forward pre-decoded `VOICE_STATE_UPDATE` and `VOICE_SERVER_UPDATE` packets to the library by calling the `voiceStateUpdate` and `voiceServerUpdate` methods respectively.

```js
gateway.on('VOICE_STATE_UPDATE', (shard, state) => voice.voiceStateUpdate(state)); // forward voice state updates
gateway.on('VOICE_SERVER_UPDATE', (shard, info) => voice.voiceServerUpdate(info)); // forward voice server updates
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

## Reference

### `Player`

- *readonly* `client: Client`
- `guildID: string`
- `status: Status`
- `play(track: string | Track, { start?: number, end?: number } = {}): Promise<void>`
- `setVolume(volume: number): Promise<void>`
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

### `Client`

- *abstract* `send(guildID: string, pk: any): Promise<void>`
- `players: PlayerStore`
- `load(identifier: string): Promise<TrackResponse[]>`
- `decode(track: string | string[]): Promise<TrackResponse | TrackResponse[]>`
- `voiceStateUpdate(packet: VoiceStateUpdate): Promise<boolean>`
- `voiceServerUpdate(packet: VoiceServerUpdate): Promise<boolean>`
- `voiceStates: Map<string, string>`
- `voiceServers: Map<string, VoiceServerUpdate>`
- `connection?: Connection`
- `http?: Http`
- `password: string`
- `userID: string`

```ts
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

## Discord.js example

```js
const { Client } = require('discord.js');
const { Client: Lavalink } = require('lavalink');

const client = new Client();
const voice = new class extends Lavalink {
  constructor() {
    super({
      // stuff here; see above
    });

    client.on('raw', pk => {
      if (pk.t === 'VOICE_STATE_UPDATE') this.voiceStateUpdate(pk.d);
      if (pk.t === 'VOICE_SERVER_UPDATE') this.voiceServerUpdate(pk.d);
    });
  }

  send(guildID, packet) {
    if (client.guilds.has(guildID)) return client.ws.send(packet);
    throw new Error('attempted to send a packet on the wrong shard');
  }
};
```
