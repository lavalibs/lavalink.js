import { Cluster } from '../src';
import { inspect } from 'util';
import { Client as Gateway } from '@spectacles/gateway';

if (!process.env.TOKEN) throw new Error('token not provided');
if (!process.env.USER_ID) throw new Error('user id not provided');

const gateway = new Gateway(process.env.TOKEN);
const cluster = new Cluster({
  nodes: [
    {
      password: 'youshallnotpass',
      userID: process.env.USER_ID,
      host: 'localhost:8080',
    },
    {
      password: 'youshallnotpass',
      userID: process.env.USER_ID,
      host: 'localhost:8081',
    },
  ],
  send(guildID, packet) {
    const conn = gateway.connections.get(0);
    if (conn) return conn.send(packet);
    throw new Error('no gateway connection available');
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
  if (m.content === 'destroy') await cluster.get('281630801660215296').destroy();

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

  if (m.content === 'reconnect') {
    const conn = gateway.connections.get(0);
    if (conn) conn.reconnect();
  }
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
