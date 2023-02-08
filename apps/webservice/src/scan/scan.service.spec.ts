import {createMock, DeepMocked} from '@golevelup/ts-jest'
import {ScanEvent, ScanEventDocument, ScanEventSchema, ScanStatus} from '@gr-asmt/schemas/scan-event'
import {ScanResultDocument} from '@gr-asmt/schemas/scan-result'
import {SERVICE_MSG_BUS, TOPIC_JOB_CREATED} from '@gr-asmt/utils/constants'
import {Serialized, WebserviceConfigInterface} from '@gr-asmt/utils/interfaces'
import {ConfigModule, ConfigService} from '@nestjs/config'
import {ClientKafka} from '@nestjs/microservices'
import {MongooseModule} from '@nestjs/mongoose'
import {Test, TestingModule} from '@nestjs/testing'
import {ClientSession, Types} from 'mongoose'
import {of} from 'rxjs'
import {ScanService} from './scan.service'

describe('BucketsService', () => {
  let module: TestingModule
  let scanService: ScanService
  let mockServiceEbus: DeepMocked<ClientKafka>
  let startSession: jest.SpyInstance
  const scanEvent = {
    _id: new Types.ObjectId('63e0a7ef9e2f7f82f755f7dd'),
    repoName: 'hellorepo',
    status: ScanStatus.InProgress,
    queuedAt: new Date('2023-02-06T07:10:39.652Z')
  } as unknown as ScanEventDocument
  const mockSession = {
    endSession: jest.fn().mockImplementation(() => {}),
    startTransaction: jest.fn(),
    abortTransaction: jest.fn().mockImplementation(() => {}),
    commitTransaction: jest.fn().mockImplementation(() => {})
  } as unknown as ClientSession

  const serializedScanResult: Serialized<ScanResultDocument> = {
    _id: '63e0a7f9f6ad6fc3e5bdb737',
    scanEventId: '63e0a7ef9e2f7f82f755f7dd',
    findings: []
  }

  beforeEach(async () => {
    mockServiceEbus = createMock<ClientKafka>()
    module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          envFilePath: '.env.test',
          isGlobal: true
        }),
        MongooseModule.forRootAsync({
          imports: [ConfigModule],
          inject: [ConfigService],
          useFactory: (env: ConfigService<WebserviceConfigInterface>) => ({
            uri: env.get<string>('mongodb')
          })
        }),
        MongooseModule.forFeature([{name: ScanEvent.name, schema: ScanEventSchema}])
      ],
      providers: [ScanService, {provide: SERVICE_MSG_BUS, useValue: mockServiceEbus}]
    }).compile()
    scanService = module.get<ScanService>(ScanService)
    startSession = jest.spyOn(scanService['scanEventModel'].db, 'startSession').mockResolvedValue(mockSession)
  })

  afterEach(async () => {
    await module.close()
  })

  it('should be defined', () => {
    expect(scanService).toBeDefined()
  })

  it('should find from db', async () => {
    const modelFind = jest.spyOn(scanService['scanEventModel'], 'findById').mockResolvedValueOnce(scanEvent)
    const res = await scanService.find(scanEvent._id.toString())
    expect(modelFind).toBeCalledTimes(1)
    expect(res).toEqual(scanEvent)
  })

  describe('postJob', () => {
    let modelCreate: jest.SpyInstance
    beforeEach(() => {
      scanEvent.toJSON = jest.fn()
      modelCreate = jest
        .spyOn(scanService['scanEventModel'], 'create')
        .mockImplementationOnce(() => Promise.resolve([scanEvent]))
    })

    afterEach(() => {
      jest.resetAllMocks()
    })
    it('should create the job and emit created event', async () => {
      mockServiceEbus.emit.mockImplementationOnce(() => of('RX BUBBLE'))
      const res = await scanService.postJob({repoName: 'REPO_NAME'})
      expect(startSession).toBeCalledTimes(1)
      expect(modelCreate).toBeCalledWith([{repoName: 'REPO_NAME', queuedAt: expect.any(Date) as Date}], {
        session: mockSession
      })
      expect(mockServiceEbus.emit).toBeCalledWith(TOPIC_JOB_CREATED, {
        key: expect.any(String) as string,
        value: scanEvent.toJSON()
      })
      expect(mockSession.commitTransaction).toBeCalledTimes(1)
      expect(mockSession.endSession).toBeCalledTimes(1)
      expect(res).toEqual(scanEvent)
    })

    it('should abort transaction if event emitting fails', async () => {
      mockServiceEbus.emit.mockImplementationOnce(() => {
        throw new Error('ERROR')
      })

      await expect(scanService.postJob({repoName: 'REPO_NAME'})).rejects.toThrowError('ERROR')
      expect(startSession).toBeCalledTimes(1)
      expect(modelCreate).toBeCalledWith([{repoName: 'REPO_NAME', queuedAt: expect.any(Date) as Date}], {
        session: mockSession
      })
      expect(mockSession.abortTransaction).toBeCalledTimes(1)
      expect(mockSession.endSession).toBeCalledTimes(1)
    })
  })

  describe('captureProcessJob', () => {
    it('should update entry to success for scan result with 0 finding', async () => {
      const modelFindByIdAndUpdate = jest
        .spyOn(scanService['scanEventModel'], 'findByIdAndUpdate')
        .mockResolvedValueOnce(scanEvent)
      const res = await scanService.captureProcessJob(serializedScanResult)
      expect(modelFindByIdAndUpdate).toBeCalledWith(serializedScanResult.scanEventId, {
        status: ScanStatus.Success,
        scanResult: serializedScanResult
      })
      expect(res).toEqual(scanEvent)
    })

    it('should update entry to failure for scan result with 1 or more findings', async () => {
      const modelFindByIdAndUpdate = jest
        .spyOn(scanService['scanEventModel'], 'findByIdAndUpdate')
        .mockResolvedValueOnce(scanEvent)
      const res = await scanService.captureProcessJob({
        ...serializedScanResult,
        findings: [
          {
            type: 'sast',
            location: {
              path: 'Discombobulate_Pandiculation',
              positions: {
                begin: {
                  line: 2716
                }
              }
            }
          }
        ]
      })
      expect(modelFindByIdAndUpdate).toBeCalledWith(serializedScanResult.scanEventId, {
        status: ScanStatus.Failure,
        scanResult: {
          ...serializedScanResult,
          findings: [
            {
              type: 'sast',
              location: {
                path: 'Discombobulate_Pandiculation',
                positions: {
                  begin: {
                    line: 2716
                  }
                }
              }
            }
          ]
        }
      })
      expect(res).toEqual(scanEvent)
    })
  })

  it('should update status to inProgress for the JobStarted Event', async () => {
    const modelFindByIdAndUpdate = jest
      .spyOn(scanService['scanEventModel'], 'findByIdAndUpdate')
      .mockResolvedValueOnce(scanEvent)
    const res = await scanService.processJobStarted('SCANID')
    expect(modelFindByIdAndUpdate).toBeCalledWith('SCANID', {status: ScanStatus.InProgress})
    expect(res).toEqual(scanEvent)
  })

  it('should update status to failure for the JobStarted Event and put error meta', async () => {
    const modelFindByIdAndUpdate = jest
      .spyOn(scanService['scanEventModel'], 'findByIdAndUpdate')
      .mockResolvedValueOnce(scanEvent)
    const res = await scanService.processJobFailed('SCANID', {name: 'E', message: 'M'})
    expect(modelFindByIdAndUpdate).toBeCalledWith('SCANID', {
      errorOrigin: {name: 'E', message: 'M'}
    })
    expect(res).toEqual(scanEvent)
  })
})
