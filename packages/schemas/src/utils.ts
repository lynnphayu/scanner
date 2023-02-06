import {Document, Types} from 'mongoose'

export type DocumentWithId = Omit<Document<Types.ObjectId, unknown, unknown>, '_id' | '__v'> & {_id: Types.ObjectId}
