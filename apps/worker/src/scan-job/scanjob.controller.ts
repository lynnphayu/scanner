import {ScanEventDocument} from '@gr-asmt/schemas/scan-event'
import {TOPIC_JOB_CREATED} from '@gr-asmt/utils/constants'
import {commit} from '@gr-asmt/utils/helpers'
import {Serialized} from '@gr-asmt/utils/interfaces'
import {Controller} from '@nestjs/common'
import {Ctx, EventPattern, KafkaContext, Payload} from '@nestjs/microservices'
import {ScanJobService} from './scanjob.service'

@Controller('')
export class ScanController {
  constructor(private readonly scanjobService: ScanJobService) {}

  @EventPattern(TOPIC_JOB_CREATED)
  async pushQueue(@Payload() payload: Serialized<ScanEventDocument>, @Ctx() kafkaCtx: KafkaContext) {
    await this.scanjobService.processJob(payload).then(async (result) => {
      return commit(kafkaCtx)
    })
  }
}
