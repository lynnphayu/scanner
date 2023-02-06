import {ConfigInterface} from '@gr-asmt/utils/interfaces'
import {ValidationPipe} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'
import {NestFactory} from '@nestjs/core'
import {MicroserviceOptions, Transport} from '@nestjs/microservices'
import {AppModule} from './app.module'

async function bootstrap() {
  const app = await NestFactory.create(AppModule)
  const config: ConfigService<ConfigInterface> = app.get(ConfigService)
  app.useGlobalPipes(new ValidationPipe({transform: true}))
  app.connectMicroservice<MicroserviceOptions>({
    transport: Transport.KAFKA,
    options: {
      run: {autoCommit: false},
      client: {brokers: config.get<string>('brokers')!.split(',')},
      consumer: {
        groupId: 'worker',
        readUncommitted: true
      }
    }
  })
  await app.startAllMicroservices()
  await app.listen(config.get<string>('port')!, config.get<string>('host')!)
}
void bootstrap()
