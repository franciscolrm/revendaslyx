import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { SupabaseModule } from './common/supabase/supabase.module';
import { ScopeModule } from './common/scope/scope.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ResalesModule } from './resales/resales.module';
import { FinancialModule } from './financial/financial.module';
import { ImportsModule } from './imports/imports.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { OrgModule } from './org/org.module';
import { ClientsModule } from './clients/clients.module';
import { EnterprisesModule } from './enterprises/enterprises.module';
import { UnitsModule } from './units/units.module';
import { ProcessesModule } from './processes/processes.module';
import { DocumentsModule } from './documents/documents.module';
import { TasksModule } from './tasks/tasks.module';
import { ActivitiesModule } from './activities/activities.module';
import { NotificationsModule } from './notifications/notifications.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { CarteirasModule } from './carteiras/carteiras.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },   // 10 req/s
      { name: 'medium', ttl: 60000, limit: 100 }, // 100 req/min
    ]),
    SupabaseModule,
    ScopeModule,
    AuthModule,
    UsersModule,
    ResalesModule,
    FinancialModule,
    ImportsModule,
    DashboardModule,
    OrgModule,
    ClientsModule,
    EnterprisesModule,
    UnitsModule,
    ProcessesModule,
    DocumentsModule,
    TasksModule,
    ActivitiesModule,
    NotificationsModule,
    IntegrationsModule,
    CarteirasModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
