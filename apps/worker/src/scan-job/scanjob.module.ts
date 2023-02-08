//

import {ScanResult, ScanResultSchema} from '@gr-asmt/schemas/scan-result'
import {Module} from '@nestjs/common'
import {MongooseModule} from '@nestjs/mongoose'
import {NameGenerator} from '~/common/namegen.service'
import {ScanController} from './scanjob.controller'
import {ScanJobService} from './scanjob.service'

@Module({
  imports: [MongooseModule.forFeature([{name: ScanResult.name, schema: ScanResultSchema}])],
  controllers: [ScanController],
  providers: [ScanJobService, NameGenerator],
  exports: [ScanJobService]
})
export class ScanModule {}
