import {Document, Types} from 'mongoose'

export type Serialized<T> = Omit<
  {
    [k in keyof T]: T[k] extends Types.ObjectId
      ? string
      : T[k] extends Types.ObjectId | undefined
      ? string | undefined
      : T[k] extends Types.ObjectId[] | undefined
      ? string[] | undefined
      : T[k] extends Types.ObjectId[]
      ? string[]
      : T[k] extends Date
      ? string
      : T[k] extends Date | undefined
      ? string | undefined
      : T[k] extends Date[] | undefined
      ? string[] | undefined
      : T[k] extends Date[]
      ? string[]
      : T[k] extends object
      ? Serialized<T[k]>
      : T[k]
  },
  keyof Omit<Document, '_id'>
>

export interface NameGenClientOptions {
  url: string
}

export interface ConfigInterface {
  mongodb: string
  brokers: string
  host: string
  port: string
  nameGeneratorUrl: string
}
