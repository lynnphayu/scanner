import {Controller, Get} from '@nestjs/common'

@Controller()
export class AppController {
  constructor() {}

  @Get('ping')
  getHello() {
    return 'pong'
  }
}
