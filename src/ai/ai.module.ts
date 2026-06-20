import { Module, Global } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { AiService } from './ai.service';

@Global()
@Module({
  imports: [
    CacheModule.register({
      ttl: 24 * 60 * 60 * 1000, // 24 hours
    }),
  ],
  providers: [AiService],
  exports: [AiService],
})
export class AiModule {}
