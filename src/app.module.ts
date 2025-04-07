import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
import { LabsModule } from './labs/labs.module';
import { UserModule } from './user/user.module';
import { AddressModule } from './address/address.module';
import { TestCatalogModule } from './test-catalog/test-catalog.module';
import { LabTestsModule } from './lab-tests/lab-tests.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    AuthModule,
    PrismaModule,
    LabsModule,
    UserModule,
    AddressModule,
    TestCatalogModule,
    LabTestsModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule { }
