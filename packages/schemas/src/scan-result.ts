import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose'
import {ObjectId, Schema as MongooseSchema} from 'mongoose'
import {DocumentWithId} from './utils'

@Schema()
export class PostionPlacement {
  @Prop({required: true})
  line: number
}
const PostionPlacementSchema = SchemaFactory.createForClass(PostionPlacement)

@Schema()
export class Postion {
  @Prop({required: true, type: PostionPlacementSchema})
  begin: PostionPlacement

  // @Prop({required: true, type: PostionPlacementSchema})
  // end: PostionPlacement
}
const PostionSchema = SchemaFactory.createForClass(Postion)

@Schema()
export class Location {
  @Prop({required: true})
  path: string

  @Prop({required: true, type: PostionSchema})
  positions: Postion
}
const LocationSchema = SchemaFactory.createForClass(Location)

@Schema()
export class Finding {
  @Prop({required: true})
  type: string

  @Prop({required: true, type: LocationSchema})
  location: Location
}
const FindingSchema = SchemaFactory.createForClass(Finding)

@Schema()
export class ScanResult {
  @Prop({type: MongooseSchema.Types.ObjectId, required: true, unique: true})
  scanEventId: ObjectId

  @Prop({type: [{type: FindingSchema}], default: []})
  findings: Finding[]
}

export type ScanResultDocument = ScanResult & DocumentWithId
export const ScanResultSchema = SchemaFactory.createForClass(ScanResult)
