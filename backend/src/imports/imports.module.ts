import { Module } from '@nestjs/common';
import { ImportsController } from './imports.controller';
import { ImportsService } from './imports.service';
import { ImportProcessorService } from './import-processor.service';

@Module({
  controllers: [ImportsController],
  providers: [ImportsService, ImportProcessorService],
})
export class ImportsModule {}
