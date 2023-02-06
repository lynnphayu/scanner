import {ScanResultDocument} from '@gr-asmt/schemas/*'
import {TOPIC_JOB_PROCESSED, TOPIC_JOB_STARTED} from '@gr-asmt/utils/constants'
import {commit} from '@gr-asmt/utils/helpers'
import {Serialized} from '@gr-asmt/utils/interfaces'
import {Body, Controller, Get, Post} from '@nestjs/common'
import {Ctx, EventPattern, KafkaContext, Payload} from '@nestjs/microservices'

import {JobDto} from './dtos/job.dto'
import {ScanService} from './scan.service'

@Controller('/scan')
export class ScanController {
  constructor(private readonly scanService: ScanService) {}

  @Get()
  get() {
    return ''
  }

  @Post()
  pushQueue(@Body() payload: JobDto) {
    return this.scanService.postJob(payload)
  }

  @EventPattern(TOPIC_JOB_PROCESSED)
  async captureDataChangeJobProcessedEvt(
    @Payload() payload: Serialized<ScanResultDocument>,
    @Ctx() kafkaCtx: KafkaContext
  ) {
    await this.scanService.captureProcessJob(payload)
    await commit(kafkaCtx)
  }

  @EventPattern(TOPIC_JOB_STARTED)
  async processJobStarted(@Payload() scanEventId: string, @Ctx() kafkaCtx: KafkaContext) {
    await this.scanService.processJobStarted(scanEventId)
    await commit(kafkaCtx)
  }
}
