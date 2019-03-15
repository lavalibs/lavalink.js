const { Node } = require('../dist');
const { inspect } = require('util');
const { Client: Gateway } = require('@spectacles/gateway');

const gateway = new Gateway(process.env.TOKEN);
const client = new Node({
  password: 'youshallnotpass',
  userID: process.env.USER_ID,
  hosts: {
    rest: 'http://localhost:8081',
    ws: 'ws://localhost:8080',
  },
  send(guild, packet) {
    return gateway.connections.get(0).send(packet);
  },
});

gateway.on('READY', console.log);

gateway.on('MESSAGE_CREATE', async (shard, m) => {
  console.log(m.content);
  if (m.content === 'join') await client.players.get('281630801660215296').join('281630801660215297');
  if (m.content === 'leave') await client.players.get('281630801660215296').leave();
  if (m.content === 'pause') await client.players.get('281630801660215296').pause();

  if (m.content === 'decode') {
    const trackResponse = await client.load('https://www.youtube.com/playlist?list=PLe8jmEHFkvsaDOOWcREvkgFoj6MD0pQ67');
    const decoded = await client.decode(trackResponse.tracks.map(t => t.track));
    console.log(decoded.every((e, i) => typeof e === 'object'));
  }

  if (m.content === 'play') {
    const trackResponse = await client.load('https://www.youtube.com/playlist?list=PLe8jmEHFkvsaDOOWcREvkgFoj6MD0pQ67');
    client.players.get('281630801660215296').play(trackResponse.tracks[0]);
  }

  if (m.content.startsWith('eval')) console.log(eval(m.content.slice(4).trim()));

  if (m.content === 'reconnect') gateway.connections.get(0).reconnect();
  console.log('finished');
});

gateway.on('VOICE_STATE_UPDATE', (shard, s) => client.voiceStateUpdate(s));
gateway.on('VOICE_SERVER_UPDATE', (shard, s) => client.voiceServerUpdate(s));
gateway.on('close', console.log);
gateway.on('error', (shard, err) => console.log(inspect(err, { depth: 2 })));

let i = 0;
client.on('error', e => console.error(i++, e));
client.on('open', () => console.log('ll open'));
client.on('close', () => console.log('ll close'));

(async () => {
  try {
    await gateway.spawn();
  } catch (e) {
    console.error(e);
  }
})();
