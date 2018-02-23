const { Client } = require('../dist');
const axios = require('axios');
const { inspect } = require('util');
const { Client: Gateway } = require('@spectacles/gateway');

const gateway = new Gateway(process.env.TOKEN);
const client = new Client({
  password: 'youshallnotpass',
  shards: 1,
  userID: process.env.USER_ID,
});

gateway.on('READY', console.log);

gateway.on('MESSAGE_CREATE', async m => {
  if (m.content === 'join') {
    await gateway.connections.get(0).send(4, {
      guild_id: '281630801660215296',
      channel_id: '281630801660215297',
      self_mute: false,
      self_deaf: true,
    });
  }

  if (m.content === 'leave') {
    await gateway.connections.get(0).send(4, {
      guild_id: '281630801660215296',
      channel_id: null,
      self_mute: false,
      self_deaf: true,
    });
  }

  if (m.content === 'play') {
    const { data } = await axios({
      method: 'get',
      url: 'http://localhost:8081/loadtracks',
      params: { identifier: 'https://www.twitch.tv/monstercat' },
      headers: { Authorization: client.password },
    });

    client.players.get('281630801660215296').play(data[0].track);
  }
});

gateway.on('VOICE_STATE_UPDATE', s => client.voiceStateUpdate(s));
gateway.on('VOICE_SERVER_UPDATE', s => client.voiceServerUpdate(s));
gateway.on('close', console.log);
gateway.on('error', (shard, err) => console.log(inspect(err, { depth: 2 })));

(async () => {
  try {
    await client.connect('ws://localhost:8080');
    await gateway.spawn();
  } catch (e) {
    console.error(e);
  }
})();
