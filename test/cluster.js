const { Cluster } = require('../dist');
const { inspect } = require('util');
const { Client: Gateway } = require('@spectacles/gateway');

const gateway = new Gateway(process.env.TOKEN);
const cluster = new Cluster({
  nodes: [
    {
      password: 'youshallnotpass',
      userID: process.env.USER_ID,
      hosts: {
        rest: 'http://localhost:8081',
        ws: 'ws://localhost:8080',
      },
    },
    {
      password: 'youshallnotpass',
      userID: process.env.USER_ID,
      hosts: {
        rest: 'http://localhost:8083',
        ws: 'ws://localhost:8082',
      },
    },
  ],
  send(guildID, packet) {
    return gateway.connections.get(0).send(packet);
  },
  filter(node, guildID) {
    // return node.tags.includes(client.guilds.get(guildID).region));
    return true;
  },
});

gateway.on('READY', console.log);

gateway.on('MESSAGE_CREATE', async (shard, m) => {
  console.log(m.content);
  if (m.content === 'join') await cluster.get('281630801660215296').join('281630801660215297');
  if (m.content === 'leave') await cluster.get('281630801660215296').leave();
  if (m.content === 'pause') await cluster.get('281630801660215296').pause();

  if (m.content === 'decode') {
    const trackResponse = await cluster.get('281630801660215296').node.load('https://www.youtube.com/playlist?list=PLe8jmEHFkvsaDOOWcREvkgFoj6MD0pQ67');
    const decoded = await cluster.get('281630801660215296').node.decode(trackResponse.tracks.map(t => t.track));
    console.log(decoded.every((e, i) => typeof e === 'object'));
  }

  if (m.content === 'play') {
    const trackResponse = await cluster.get('281630801660215296').node.load('https://www.youtube.com/playlist?list=PLe8jmEHFkvsaDOOWcREvkgFoj6MD0pQ67');
    cluster.get('281630801660215296').play(trackResponse.tracks[0]);
  }

  if (m.content === 'stats') {
    console.log(cluster.nodes.map(node => node.stats));
  }

  if (m.content === 'reconnect') gateway.connections.get(0).reconnect();
  console.log('finished');
});

gateway.on('VOICE_STATE_UPDATE', (shard, s) => cluster.voiceStateUpdate(s));
gateway.on('VOICE_SERVER_UPDATE', (shard, s) => cluster.voiceServerUpdate(s));
gateway.on('close', console.log);
gateway.on('error', (shard, err) => console.log(inspect(err, { depth: 2 })));

(async () => {
  try {
    await gateway.spawn();
  } catch (e) {
    console.error(e);
  }
})();
