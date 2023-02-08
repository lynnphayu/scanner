const commitSpy = jest.fn().mockImplementation(() => Promise.resolve())
jest.mock('@gr-asmt/utils/helpers', () => ({
  commit: commitSpy
}))

import {createMock} from '@golevelup/ts-jest'
import {ScanEventDocument, ScanStatus} from '@gr-asmt/schemas/scan-event'
import {ScanResultDocument} from '@gr-asmt/schemas/scan-result'
import {Serialized} from '@gr-asmt/utils/interfaces'
import {KafkaContext} from '@nestjs/microservices'
import {Test, TestingModule} from '@nestjs/testing'
import {Types} from 'mongoose'
import {ScanController} from './scan.controller'
import {ScanService} from './scan.service'

describe('ScanController', () => {
  let scanController: ScanController
  const scanService = createMock<ScanService>()
  const kafkaContext = createMock<KafkaContext>()
  const scanEvent = {
    _id: new Types.ObjectId('63e0a7ef9e2f7f82f755f7dd'),
    repoName: 'hellorepo',
    status: ScanStatus.InProgress,
    queuedAt: new Date('2023-02-06T07:10:39.652Z')
  } as unknown as ScanEventDocument

  const serializedScanResult: Serialized<ScanResultDocument> = {
    _id: '63e0a7f9f6ad6fc3e5bdb737',
    scanEventId: '63e0a7ef9e2f7f82f755f7dd',
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

  beforeEach(async () => {
    const app: TestingModule = await Test.createTestingModule({
      controllers: [ScanController],
      providers: [{provide: ScanService, useValue: scanService}]
    }).compile()

    scanController = app.get<ScanController>(ScanController)
  })

  describe('get', () => {
    it('should find with service"', async () => {
      scanService.find.mockResolvedValueOnce(scanEvent)
      const scan = await scanController.get(scanEvent._id.toString())
      expect(scan).toEqual(scanEvent)
    })
  })

  describe('postQueue', () => {
    it('should process job and commit "', async () => {
      scanService.captureProcessJob.mockResolvedValueOnce(scanEvent)
      await scanController.captureDataChangeJobProcessedEvt(serializedScanResult, kafkaContext)
      expect(scanService.captureProcessJob).toBeCalledWith(serializedScanResult)
      expect(commitSpy).toBeCalledTimes(1)
      expect(commitSpy).toBeCalledWith(kafkaContext)
    })
  })

  describe('processJobStarted', () => {
    it('should process event and commit "', async () => {
      scanService.processJobStarted.mockResolvedValueOnce(scanEvent)
      await scanController.processJobStarted(scanEvent._id.toString(), kafkaContext)
      expect(scanService.processJobStarted).toBeCalledWith(scanEvent._id.toString())
      expect(commitSpy).toBeCalledTimes(1)
      expect(commitSpy).toBeCalledWith(kafkaContext)
    })
  })

  describe('processJobFailed', () => {
    it('should process event and commit "', async () => {
      const payload = {
        errorOrigin: {name: 'E', message: 'M'},
        scanEventId: scanEvent._id.toString()
      }
      scanService.processJobFailed.mockResolvedValueOnce({...scanEvent, status: ScanStatus.Failure})
      await scanController.processJobFailed(payload, kafkaContext)
      expect(scanService.processJobFailed).toBeCalledWith(payload.scanEventId, payload.errorOrigin)
      expect(commitSpy).toBeCalledTimes(1)
      expect(commitSpy).toBeCalledWith(kafkaContext)
    })
  })

  afterEach(() => {
    commitSpy.mockReset()
  })
})
