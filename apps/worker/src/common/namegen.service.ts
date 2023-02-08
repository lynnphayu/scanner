import {WorkerConfigInterface} from '@gr-asmt/utils/interfaces'
import {Injectable} from '@nestjs/common'
import {ConfigService} from '@nestjs/config'
import got, {Got} from 'got-cjs'

@Injectable()
export class NameGenerator {
  private readonly client: Got

  constructor(config: ConfigService<WorkerConfigInterface>) {
    this.client = got.extend({
      prefixUrl: config.get<string>('nameGeneratorUrl')!,
      responseType: 'json'
    })
  }

  getRandomNames(amt: number) {
    return this.client.get<Array<string>>(`${amt}?nameOptions=funnyWords`).then((result) => result.body)
  }
}
