import {Prop, Schema, SchemaFactory} from '@nestjs/mongoose'
import {Schema as MongooseSchema} from 'mongoose'
import {ScanResultDocument, ScanResultSchema} from '../scan-result'
import {DocumentWithId} from '../utils'

export enum ScanStatus {
  Queued = 'queued',
  InProgress = 'inprogress',
  Success = 'success',
  Failure = 'failed',
  Vulnerability = 'vulnerability'
}

@Schema({_id: false, id: false, versionKey: false})
export class Error {
  @Prop({type: String})
  name: string

  @Prop({type: String})
  stack?: string

  @Prop({type: String})
  message: string
}

export const ErrorSchema = SchemaFactory.createForClass(Error)

@Schema()
export class ScanEvent {
  @Prop({required: true})
  repoName: string

  @Prop({
    type: String,
    enum: [ScanStatus.Queued, ScanStatus.InProgress, ScanStatus.Success, ScanStatus.Failure, ScanStatus.Vulnerability],
    required: true,
    default: ScanStatus.Queued
  })
  status: ScanStatus

  @Prop({required: true, type: MongooseSchema.Types.Date})
  queuedAt: Date

  @Prop({type: MongooseSchema.Types.Date})
  startedAt?: Date

  @Prop({type: MongooseSchema.Types.Date})
  finishedAt?: Date

  @Prop({type: ScanResultSchema})
  scanResult?: ScanResultDocument

  @Prop({type: ErrorSchema})
  errorOrigin?: Error
}

export type ScanEventDocument = ScanEvent & DocumentWithId
export const ScanEventSchema = SchemaFactory.createForClass(ScanEvent)
