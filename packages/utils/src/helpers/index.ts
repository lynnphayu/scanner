import {KafkaContext} from '@nestjs/microservices'

export const commit = async (context: KafkaContext) => {
  const topic = context.getTopic()
  const partition = context.getPartition()
  const offset = `${Number(context.getMessage().offset) + 1}`
  await context.getConsumer().commitOffsets([{topic, partition, offset}])
}
