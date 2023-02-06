import {ScanEvent, ScanEventDocument, ScanResultDocument, ScanStatus} from '@gr-asmt/schemas/*'
import {SERVICE_MSG_BUS, TOPIC_JOB_CREATED} from '@gr-asmt/utils/constants'
import {Serialized} from '@gr-asmt/utils/interfaces'
import {Inject, Injectable, InternalServerErrorException} from '@nestjs/common'
import {ClientKafka} from '@nestjs/microservices'
import {InjectModel} from '@nestjs/mongoose'
import {Model} from 'mongoose'
import {firstValueFrom} from 'rxjs'
import {v4 as uuidv4} from 'uuid'
import {JobDto} from './dtos/job.dto'

@Injectable()
export class ScanService {
  constructor(
    @InjectModel(ScanEvent.name) private readonly scanEventModel: Model<ScanEventDocument>,
    @Inject(SERVICE_MSG_BUS) private readonly eBus: ClientKafka
  ) {}

  async postJob(data: JobDto) {
    const session = await this.scanEventModel.db.startSession()
    session.startTransaction()
    const jobs = await this.scanEventModel.create([{repoName: data.repoName, queuedAt: new Date()}], {session})
    await firstValueFrom(this.eBus.emit(TOPIC_JOB_CREATED, {key: uuidv4(), value: jobs[0].toJSON()})).catch(
      async (e) => {
        await session.abortTransaction()
        await session.endSession()
        throw new InternalServerErrorException(e)
      }
    )
    await session.commitTransaction()
    await session.endSession()
    return jobs[0]
  }

  async captureProcessJob(payload: Serialized<ScanResultDocument>) {
    const scanEvent = await this.scanEventModel.findByIdAndUpdate(payload.scanEventId, {
      status: payload.findings.length && payload.findings.length > 0 ? ScanStatus.Vulnerability : ScanStatus.Success,
      scanResult: payload
    })
    return scanEvent
  }

  async processJobStarted(scanEventId: string) {
    const scanEvent = await this.scanEventModel.findByIdAndUpdate(scanEventId, {status: ScanStatus.InProgress})
    return scanEvent
  }
}
