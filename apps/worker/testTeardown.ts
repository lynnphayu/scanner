import fs from 'fs'

export default async () => {
  fs.unlinkSync(__dirname + '/.env.test')

  const mongod = globalThis.__MONGOD__

  if (mongod) await mongod.stop()
}
