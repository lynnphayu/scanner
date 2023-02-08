import {Error, ScanEvent, ScanEventDocument, ScanStatus} from '@gr-asmt/schemas/scan-event'
import {ScanResultDocument} from '@gr-asmt/schemas/scan-result'
import {SERVICE_MSG_BUS, TOPIC_JOB_CREATED} from '@gr-asmt/utils/constants'
import {Serialized} from '@gr-asmt/utils/interfaces'
import {Inject, Injectable} from '@nestjs/common'
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

  find(id: string) {
    return this.scanEventModel.findById(id)
  }

  /**
   * handler for post endpoint
   * this create a db entry for incoming request and dispatch an event to queue job to the worker.
   */
  async postJob(data: JobDto) {
    const session = await this.scanEventModel.db.startSession()
    session.startTransaction()
    const jobs = await this.scanEventModel.create([{repoName: data.repoName, queuedAt: new Date()}], {session})
    try {
      await firstValueFrom(this.eBus.emit(TOPIC_JOB_CREATED, {key: uuidv4(), value: jobs[0].toJSON()}))
    } catch (e) {
      await session.abortTransaction()
      await session.endSession()
      throw e
    }

    await session.commitTransaction()
    await session.endSession()
    return jobs[0]
  }

  async captureProcessJob(payload: Serialized<ScanResultDocument>) {
    const scanEvent = await this.scanEventModel.findByIdAndUpdate(payload.scanEventId, {
      status: payload.findings.length && payload.findings.length > 0 ? ScanStatus.Failure : ScanStatus.Success,
      scanResult: payload
    })
    return scanEvent
  }

  async processJobStarted(scanEventId: string) {
    const scanEvent = await this.scanEventModel.findByIdAndUpdate(scanEventId, {status: ScanStatus.InProgress})
    return scanEvent
  }

  async processJobFailed(scanEventId: string, e: Error) {
    const scanEvent = await this.scanEventModel.findByIdAndUpdate(scanEventId, {
      errorOrigin: e
    })
    return scanEvent
  }
}
