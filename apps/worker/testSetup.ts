import fs from 'fs'
import {MongoMemoryReplSet} from 'mongodb-memory-server'

declare global {
  // eslint-disable-next-line no-var
  var __MONGOD__: MongoMemoryReplSet
}
export default async () => {
  const mongoServer = await MongoMemoryReplSet.create()
  const mongoUrl = mongoServer.getUri()

  globalThis.__MONGOD__ = mongoServer

  const env = `mongodb=${mongoUrl}
brokers=127.0.0.1:9092
host=localhost
port=3000`
  fs.writeFileSync(__dirname + '/.env.test', env, 'utf-8')
}
