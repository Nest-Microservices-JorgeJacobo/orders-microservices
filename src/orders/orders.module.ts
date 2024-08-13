import { Module } from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { PRODUCTS_SERVICES } from 'src/config/services';
import { envs } from 'src/config';
import { NatsModule } from 'src/nats/nats.module';

@Module({
  controllers: [OrdersController],
  providers: [OrdersService],
  imports: [
    
  //   ClientsModule.register([
  //   {
  //     name: PRODUCTS_SERVICES,
  //     transport: Transport.TCP,
  //     options: {
  //       host: envs.productsMicroservicesHost,
  //       port: envs.productsMicroservicesPort
  //     }
  //   } 
  // ])

  NatsModule
],
})
export class OrdersModule {}
