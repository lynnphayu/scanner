import {Types} from 'mongoose'

export type Serialized<T> = {
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
}

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
