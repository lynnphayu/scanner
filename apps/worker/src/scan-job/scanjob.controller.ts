import {ScanEventDocument} from '@gr-asmt/schemas/*'
import {TOPIC_JOB_CREATED} from '@gr-asmt/utils/constants'
import {commit} from '@gr-asmt/utils/helpers'
import {Serialized} from '@gr-asmt/utils/interfaces'
import {Controller} from '@nestjs/common'
import {Ctx, EventPattern, KafkaContext, Payload} from '@nestjs/microservices'
import {ScanService} from './scanjob.service'

@Controller('')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @EventPattern(TOPIC_JOB_CREATED)
  async pushQueue(@Payload() payload: Serialized<ScanEventDocument>, @Ctx() kafkaCtx: KafkaContext) {
    await this.scanService.processJob(payload).then(async (result) => {
      return commit(kafkaCtx)
    })
  }
}
