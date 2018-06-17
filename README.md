# Lavalink.js

A Javascript wrapper for the Lavalink audio client for Discord.

## Getting started

```js
const { Client } = require('lavalink');

const voice = new class extends Client {
  constructor() {
    super({
      password: '', // your Lavalink password
      userID: '', // the user ID of your bot
      hosts: {
        rest: '', // the http host of your lavalink instance (optional)
        ws: '', // the ws host of your lavalink instance (optional, but highly recommended)
      },
    });
  }

  send(guildID, packet) {
    // send this packet to the gateway
  }
};
```

You must extend the provided client with your own `send` method. You can do this by either modifying the client prototype or following the pattern above: either way, you must provide a method that sends packets to the gateway through the appropriate shard.

## [How to connect](https://discordapp.com/developers/docs/topics/voice-connections#connecting-to-voice)

Use the provided `Player#join(channelID)` method to join voice channels. This method will generate the necessary packet and send it to the `Client#send` method as provided by you.

```js
voice.players.get('guild id').join('channel id');
```

Provide the raw packet to the `voiceStateUpdate` and `voiceServerUpdate` methods as shown below.

```js
gateway.on('VOICE_STATE_UPDATE', state => voice.voiceStateUpdate(state)); // forward voice state updates
gateway.on('VOICE_SERVER_UPDATE', info => voice.voiceServerUpdate(info)); // forward voice server updates
```

## How to use

Players are available in a map keyed by guild ID, and are always available: if no player has yet been generated for a guild, it will be created.

```js
const player = voice.players.get('a guild id');
```

### `Player` reference

- *readonly* `client: Client`
- `guildID: string`
- `status: Status`
- `play(track: string, { start?: number, end?: number } = {}): Promise<void>`
- `setVolume(volume: number): Promise<void>`
- `seek(position: number): Promise<void>`
- `pause(paused = true): Promise<void>`
- `stop(): Promise<void>`
- `destroy(): Promise<void>`
- `join(channel: string, { deaf = false, mute = false }): Promise<void>`

### `Client` reference

- *abstract* `send(guildID: string, pk: any): Promise<void>`
- `players: PlayerStore`
- `load(identifier: string): Promise<Track[]>`
- `decode(track: string | string[]): Promise<Track | Track[]>`
- `voiceStateUpdate(packet: VoiceStateUpdate): Promise<boolean>`
- `voiceServerUpdate(packet: VoiceServerUpdate): Promise<boolean>`
- `voiceStates: Map<string, string>`
- `voiceServers: Map<string, VoiceServerUpdate>`
- `connection?: Connection`
- `http?: Http`
- `password: string`
- `userID: string`

### Events

The client and players are event emitters. Events will only get emitted on a player if the event has a guild ID. Events are emitted with the name as the `op` property from the event; see the [lavalink implementation page](https://github.com/Frederikam/Lavalink/blob/master/IMPLEMENTATION.md#incoming-messages) for more information.

```js
voice.players.get('guild id').on('event', (d) => {
  console.log('track ended!', d);
});
```

## HTTP

You can fetch tracks for the above methods by calling the `Client#load` method with an idenfitier. This will return a result as shown in the [example implementation](https://github.com/Frederikam/Lavalink/blob/master/IMPLEMENTATION.md#rest-api).

```js
const songs = await voice.load('ytsearch:monstercat');
voice.players.get('guild.id').play(songs[0].track);
```

## Discord.js

blame [@iCrawl](https://github.com/iCrawl)
