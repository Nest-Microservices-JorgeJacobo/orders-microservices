import { HttpStatus, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-status-ordet.dto';

@Injectable()
export class OrdersService  extends PrismaClient implements OnModuleInit {

  private readonly logger = new Logger("OrdersService");

  async onModuleInit() {
    await this.$connect();
    this.logger.log("database connected.");
  }


  create(createOrderDto: CreateOrderDto) {
      return this.order.create({
        data: createOrderDto
      });  
  }

  async findAll(orderPaginationDto: OrderPaginationDto ) {

    const {page = 1, limit = 10} = orderPaginationDto;
    this.logger.log(`Pagination `, page, limit);
    const totalPages = await this.order.count({where: { status: orderPaginationDto.status}});
    const lastPage = Math.ceil(totalPages / limit);

    return {
      data: await this.order.findMany({
        skip: (page - 1 ) * limit,
        take: limit,
        where: { status: orderPaginationDto.status}
      }),
      meta: {
        page,
        total: totalPages,
        lastPage
      }
    }
  }

  async findOne(id: string) {
    const order = await this.order.findFirst(
      {
        where: {
          id
        }
      }
    );

    if (!order) {
      throw new RpcException({
        message: `Order with id ${id} not found.`,
        status: HttpStatus.NOT_FOUND
      })
    }

    return order;
  }

  // update(id: number, updateOrderDto: UpdateOrderDto) {
  //   return `This action updates a #${id} order`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} order`;
  // }

  async changeStatus(changeStatusOrderDto: ChangeOrderStatusDto) {

    const {id, status} = changeStatusOrderDto;

    const order = await this.findOne(id);

    if (!order) {
      throw new RpcException({
        message: `Order with id ${id} not found.`,
        status: HttpStatus.NOT_FOUND
      })
    }


    if(order.status === status){
      return order;
    }


    return this.order.update({
      where: {id},
      data: {
        status
      }
    })

  }
}
