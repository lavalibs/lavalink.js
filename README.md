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
    });
  }

  send(guildID, packet) {
    // send this packet to the gateway
  }
};

voice.connect('ws://localhost:port'); // the websocket URL of your Lavalink app
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

### `Player` methods

- `play(track, { start, end })`
- `setVolume(volume)`
- `seek(position)`
- `pause(paused = true)`
- `stop()`
- `join(channel, { deaf = false, mute = false })`

## HTTP

You can fetch tracks for the above methods by calling the `Client#load` method with an idenfitier. This will return a result as shown in the [example implementation](https://github.com/Frederikam/Lavalink/blob/master/IMPLEMENTATION.md#rest-api).

```js
const songs = await voice.load('ytsearch:monstercat');
voice.players.get('guild.id').play(songs[0].track);
```
