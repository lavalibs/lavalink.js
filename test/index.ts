import { Cluster } from '../src/index';

const cluster = new Cluster({
  send() {
    return Promise.resolve('memes');
  },
  filter() {
    return false;
  },
})
