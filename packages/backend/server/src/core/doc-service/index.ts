import './config';

import { Module } from '@nestjs/common';

import { DatabaseDocReader } from '../doc';
import { DocRpcController } from './controller';
import { DocServiceCronJob } from './job';

@Module({
  providers: [DatabaseDocReader, DocServiceCronJob],
  controllers: [DocRpcController],
})
export class DocServiceModule {}