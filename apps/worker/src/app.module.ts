import {SERVICE_MSG_BUS} from '@gr-asmt/utils/constants'
import {ConfigInterface} from '@gr-asmt/utils/interfaces'
import {Module} from '@nestjs/common'
import {ConfigModule, ConfigService} from '@nestjs/config'
import {ClientsModule, Transport} from '@nestjs/microservices'
import {MongooseModule} from '@nestjs/mongoose'
import {AppController} from './app.controller'
import {ScanModule} from './scan-job/scanjob.module'

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: process.env.NODE_ENV === 'production' ? '.env' : '.env.development',
      isGlobal: true
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        uri: config.get('mongodb') as string
      })
    }),
    {
      global: true,
      ...ClientsModule.registerAsync([
        {
          name: SERVICE_MSG_BUS,
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (config: ConfigService<ConfigInterface>) => {
            return {
              transport: Transport.KAFKA,
              options: {
                producerOnlyMode: true,
                client: {brokers: config.get<string>('brokers')!.split(',')},
                producer: {
                  idempotent: true
                }
              }
            }
          }
        }
      ])
    },
    ScanModule
  ],
  controllers: [AppController]
})
export class AppModule {}
