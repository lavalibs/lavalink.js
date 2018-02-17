# Lavalink.js

A Javascript wrapper for the Lavalink audio client for Discord.

## Getting started

```js
const { Client } = require('lavalink');
const { Client: Gateway } = require('@spectacles/gateway');

const gateway = new Gateway('token');
const voice = new Client({
  password: '', // your Lavalink password
  shards: 1, // how many shards your bot is running
  userID: '', // the user ID of your bot
});

voice.connect('ws://localhost'); // the websocket URL of your Lavalink app
gateway.spawn();
```

## [How to connect](https://discordapp.com/developers/docs/topics/voice-connections#connecting-to-voice)

Send an OP 4 packet to Discord and appropriately handle Discord's response.

```js
gateway.connections.get(shardID).send(4, {
  guild_id: 'a guild id',
  channel_id: 'a channel id',
  self_mute: false,
  self_deaf: true,
});
```

This example uses Spectacles gateway, but you're welcome to use any Discord library so long as you provide the raw packet to the `voiceStateUpdate` and `voiceServerUpdate` methods as shown below.

```js
gateway.on('VOICE_STATE_UPDATE', state => voice.voiceStateUpdate(state)); // forward voice state updates
gateway.on('VOICE_SERVER_UPDATE', info => voice.voiceServerUpdate(info)); // forward voice server updates
```

## How to use

Players are available in a map keyed by guild ID.

```js
const player = voice.players.get('a guild id');
```

### Available methods

- `play(track, { start, end })`
- `setVolume(volume)`
- `seek(position)`
- `pause(paused = true)`
- `stop()`
