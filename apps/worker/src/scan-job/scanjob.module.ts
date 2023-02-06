//

import {ScanResult, ScanResultSchema} from '@gr-asmt/schemas/*'
import {Module} from '@nestjs/common'
import {MongooseModule} from '@nestjs/mongoose'
import {NameGenerator} from '~/common/namegen.service'
import {ScanController} from './scanjob.controller'
import {ScanService} from './scanjob.service'

@Module({
  imports: [MongooseModule.forFeature([{name: ScanResult.name, schema: ScanResultSchema}])],
  controllers: [ScanController],
  providers: [ScanService, NameGenerator],
  exports: [ScanService]
})
export class ScanModule {}
