import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CloudBaseService } from './cloudbase.service.js';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [CloudBaseService],
  exports: [CloudBaseService],
})
export class CloudBaseModule {}
