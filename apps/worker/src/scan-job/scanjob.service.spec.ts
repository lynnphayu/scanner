import {createMock, DeepMocked} from '@golevelup/ts-jest'
import {ScanEventDocument, ScanStatus} from '@gr-asmt/schemas/scan-event'
import {ScanResult, ScanResultDocument, ScanResultSchema} from '@gr-asmt/schemas/scan-result'
import {SERVICE_MSG_BUS, TOPIC_JOB_CREATED_DLT, TOPIC_JOB_PROCESSED, TOPIC_JOB_STARTED} from '@gr-asmt/utils/constants'
import {Serialized, WorkerConfigInterface} from '@gr-asmt/utils/interfaces'
import {ConfigModule, ConfigService} from '@nestjs/config'
import {ClientKafka} from '@nestjs/microservices'
import {MongooseModule} from '@nestjs/mongoose'
import {Test, TestingModule} from '@nestjs/testing'
import {ClientSession, Types} from 'mongoose'
import {of} from 'rxjs'
import {NameGenerator} from '~/common/namegen.service'
import {ScanJobService} from './scanjob.service'

describe('BucketsService', () => {
  let module: TestingModule
  let scanjobService: ScanJobService
  let mockServiceEbus: DeepMocked<ClientKafka>
  let mockNameGenerator: DeepMocked<NameGenerator>
  let startSession: jest.SpyInstance
  const scanEvent = {
    _id: '63e0a7ef9e2f7f82f755f7dd',
    repoName: 'hellorepo',
    status: ScanStatus.InProgress,
    queuedAt: '2023-02-06T07:10:39.652Z'
  } as Serialized<ScanEventDocument>
  const mockSession = {
    endSession: jest.fn().mockImplementation(() => {}),
    startTransaction: jest.fn(),
    abortTransaction: jest.fn().mockImplementation(() => {}),
    commitTransaction: jest.fn().mockImplementation(() => {})
  } as unknown as ClientSession

  const scanResult = {
    _id: new Types.ObjectId('63e0a7f9f6ad6fc3e5bdb737'),
    scanEventId: new Types.ObjectId('63e0a7ef9e2f7f82f755f7dd'),
    findings: [],
    toJSON: () => ({
      json: 'JSON'
    })
  } as unknown as ScanResultDocument

  beforeEach(async () => {
    mockServiceEbus = createMock<ClientKafka>({emit: () => of('OK')})
    mockNameGenerator = createMock<NameGenerator>()
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true
        }),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (env: ConfigService<WorkerConfigInterface>) => ({
            uri: env.get<string>('mongodb')
          })
        }),
        MongooseModule.forFeature([{name: ScanResult.name, schema: ScanResultSchema}])
      ],
      providers: [
        ScanJobService,
        {provide: SERVICE_MSG_BUS, useValue: mockServiceEbus},
        {provide: NameGenerator, useValue: mockNameGenerator}
      ]
    }).compile()
    scanjobService = module.get<ScanJobService>(ScanJobService)
    startSession = jest.spyOn(scanjobService['scanResultModel'].db, 'startSession').mockResolvedValue(mockSession)
  })

  afterEach(async () => {
    await module.close()
  })

  it('should be defined', () => {
    expect(scanjobService).toBeDefined()
  })

  describe('processJob', () => {
    const genRandom: jest.Mock = jest.fn()
    let modelCreate: jest.SpyInstance
    const names = ['Fard_Fuddy-duddy', 'Brouhaha_Smellfungus', 'Fartlek_Collop', 'Ornery_Lagopodous']
    beforeEach(() => {
      mockNameGenerator.getRandomNames.mockResolvedValueOnce(names)
      modelCreate = jest.spyOn(scanjobService['scanResultModel'], 'create')
    })
    afterEach(() => {
      jest.resetAllMocks()
    })
    it('should process the job', async () => {
      scanjobService['genRandom'] = genRandom.mockReturnValue(4)
      modelCreate.mockResolvedValueOnce([scanResult])
      await scanjobService.processJob(scanEvent)
      expect(startSession).toBeCalledTimes(1)
      expect(mockSession.startTransaction).toBeCalledTimes(1)
      expect(mockServiceEbus.emit).toBeCalledWith(TOPIC_JOB_STARTED, {key: scanEvent._id, value: scanEvent._id})
      expect(genRandom).toBeCalledWith(10)
      expect(genRandom).toBeCalledWith(5)
      expect(mockNameGenerator.getRandomNames).toBeCalledWith(4)
      expect(genRandom).toBeCalledTimes(6)
      expect(modelCreate).toBeCalledWith(
        [
          {
            scanEventId: new Types.ObjectId(scanEvent._id),
            findings: names.map((filename) => ({
              type: 'sast',
              location: {
                path: filename,
                positions: {
                  begin: {line: 4}
                }
              }
            }))
          }
        ],
        {session: mockSession}
      )
      expect(mockServiceEbus.emit).toBeCalledWith(TOPIC_JOB_PROCESSED, {key: scanEvent._id, value: scanResult.toJSON()})
      expect(mockSession.commitTransaction).toBeCalledTimes(1)
      expect(mockSession.endSession).toBeCalledTimes(1)
    })

    it('should abort transaction and push to DLT', async () => {
      scanjobService['genRandom'] = genRandom.mockReturnValue(4)
      modelCreate.mockRejectedValueOnce(new Error('DB ERROR'))
      await scanjobService.processJob(scanEvent)
      expect(mockSession.abortTransaction).toBeCalledTimes(1)
      expect(mockSession.endSession).toBeCalledTimes(1)
      expect(mockServiceEbus.emit).toBeCalledWith(TOPIC_JOB_CREATED_DLT, {
        key: scanEvent._id,
        value: {
          scanEventId: scanEvent._id,
          errorOrigin: {name: 'Error', message: 'DB ERROR', stack: expect.any(String) as string}
        }
      })
    })
  })
})
