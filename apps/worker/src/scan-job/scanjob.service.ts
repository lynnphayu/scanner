import {Finding, ScanEventDocument, ScanResult, ScanResultDocument} from '@gr-asmt/schemas/*'
import {SERVICE_MSG_BUS, TOPIC_JOB_PROCESSED, TOPIC_JOB_STARTED} from '@gr-asmt/utils/constants'
import {Serialized} from '@gr-asmt/utils/interfaces'
import {Inject, Injectable} from '@nestjs/common'
import {ClientKafka} from '@nestjs/microservices'
import {InjectModel} from '@nestjs/mongoose'
import {Model, Types} from 'mongoose'
import {firstValueFrom} from 'rxjs'
import {NameGenerator} from '~/common/namegen.service'

@Injectable()
export class ScanService {
  constructor(
    @InjectModel(ScanResult.name) private readonly scanResultModel: Model<ScanResultDocument>,
    private readonly nameGen: NameGenerator,
    @Inject(SERVICE_MSG_BUS) private readonly ebus: ClientKafka
  ) {}

  private genRandom(pool: number) {
    return Math.floor(Math.random() * pool) + 1
  }

  async processJob(scanEvent: Serialized<ScanEventDocument>) {
    await firstValueFrom(this.ebus.emit(TOPIC_JOB_STARTED, {key: scanEvent._id, value: scanEvent._id}))
    await new Promise((resolve) => setTimeout(resolve, this.genRandom(10) * 1000))
    const vulnerabilities = this.genRandom(5)
    const randoms = await this.nameGen.getRandomNames(vulnerabilities)
    const findings = randoms.map<Finding>((filename) => ({
      type: 'sast',
      location: {
        path: filename,
        positions: {
          begin: {line: this.genRandom(3000)}
        }
      }
    }))
    const session = await this.scanResultModel.db.startSession()
    session.startTransaction()
    const scanResult = await this.scanResultModel
      .create([{scanEventId: new Types.ObjectId(scanEvent._id), findings}], {
        session
      })
      .then((res) => res[0])
    await firstValueFrom(this.ebus.emit(TOPIC_JOB_PROCESSED, {key: scanEvent._id, value: scanResult.toJSON()})).catch(
      async (e) => {
        await session.abortTransaction()
        await session.endSession()
        throw e
      }
    )
    await session.commitTransaction()
    await session.endSession()
    return
  }
}
