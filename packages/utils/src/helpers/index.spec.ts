import {createMock} from '@golevelup/ts-jest'
import {KafkaContext} from '@nestjs/microservices'
import {commit} from './index'

describe('commit', () => {
  const commitOffsets = jest.fn().mockImplementation(() => Promise.resolve())
  const kafkaCtx = createMock<KafkaContext>({
    getTopic: () => 'TOPIC',
    getPartition: () => 2,
    getMessage: () => ({
      offset: `1`
    }),
    getConsumer: () => ({commitOffsets})
  })
  it('should commit according to ctx', async () => {
    await commit(kafkaCtx)
    expect(kafkaCtx.getTopic).toBeCalledTimes(1)
    expect(kafkaCtx.getPartition).toBeCalledTimes(1)
    expect(kafkaCtx.getMessage).toBeCalledTimes(1)
    expect(kafkaCtx.getConsumer).toBeCalledTimes(1)
    expect(commitOffsets).toBeCalledWith([
      {
        topic: 'TOPIC',
        partition: 2,
        offset: '2'
      }
    ])
  })
})
