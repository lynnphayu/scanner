//

import {ScanEvent, ScanEventSchema} from '@gr-asmt/schemas/scan-event'
import {Module} from '@nestjs/common'
import {MongooseModule} from '@nestjs/mongoose'
import {ScanController} from './scan.controller'
import {ScanService} from './scan.service'

@Module({
  imports: [MongooseModule.forFeature([{name: ScanEvent.name, schema: ScanEventSchema}])],
  controllers: [ScanController],
  providers: [ScanService],
  exports: [ScanService]
})
export class ScanModule {}
