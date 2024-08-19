import { HttpStatus, Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { OrderPaginationDto } from './dto/order-pagination.dto';
import { ChangeOrderStatusDto } from './dto/change-status-ordet.dto';
import { NATS_SERVICES, PRODUCTS_SERVICES } from 'src/config/services';
import { firstValueFrom } from 'rxjs';
import { OrderWithProducts } from './order-with-product-name.interfaces';
import { PaidOrderDto } from './dto';

@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  constructor(
    @Inject(NATS_SERVICES) private readonly productsClient: ClientProxy
  ) {
    super();
  }


  private readonly logger = new Logger("OrdersService");

  async onModuleInit() {
    await this.$connect();
    this.logger.log("database connected.");
  }


  async create(createOrderDto: CreateOrderDto) {
    // return this.order.create({
    //   data: createOrderDto
    // });        
    const ids: number[] = createOrderDto.items.map(items => {
      return items.productId
    });

    try {
      const products: any[] = await firstValueFrom(this.productsClient.send({ cmd: 'validate_products' }, ids));

      // 2. calcular valores

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(product => product.id === orderItem.productId).price;

        return price * orderItem.quantity;

      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      // 3. crear transacción de base de datos. 

      // this.$transaction // cuando hay más de una transacción que son diferentes tablas

      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          order: {
            createMany: {
              data: createOrderDto.items.map((orderItem) => ({
                price: products.find(product => product.id === orderItem.productId).price,
                productId: orderItem.productId,
                quantity: orderItem.quantity
              }))
            }
          }
        },
        include:  {
          // order: true,
          order: {
            select: {
              price: true,
              quantity: true,
              productId: true
            }
          }
        }
      });


      return {
        ...order,
        order: order.order.map((orderItem)=>{
          return  {
            ...orderItem,
            name: products.find(product => product.id === orderItem.productId).name
          }
        })
      };

      // return products;



    } catch (error) {
      console.log(error)
      throw new RpcException(error);
    }

    return {
      services: 'order',
      createOrderDto
    }
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {

    const { page = 1, limit = 10 } = orderPaginationDto;
    // this.logger.log(`Pagination `, page, limit);
    const totalPages = await this.order.count({ where: { status: orderPaginationDto.status } });
    const lastPage = Math.ceil(totalPages / limit);

    return {
      data: await this.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { status: orderPaginationDto.status }
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
        },
        include: {
          order:  {
            select:  {
              price: true, 
              productId: true, 
              quantity: true
            }
          }
        }
      }
    );
    if (!order) {
      throw new RpcException({
        message: `Order with id ${id} not found.`,
        status: HttpStatus.NOT_FOUND
      })
    }


    // this.logger.log(order);

    // const itemsOrder = await this.orderItem.findMany({
    //   where: {
    //     orderId: id
    //   }
    // });

    // this.logger.log(itemsOrder);


    // return {...order, itemsOrder};


    const productsIds: number[] = order.order.map(orderItem => orderItem.productId);
    const products: any[] = await firstValueFrom(this.productsClient.send({ cmd: 'validate_products' }, productsIds));

    return {
      ...order,
      order: order.order.map(orderItem => ({
        ...orderItem,
        name: products.find(product=> product.id === orderItem.productId).name
      }))
    }

  }

  // update(id: number, updateOrderDto: UpdateOrderDto) {
  //   return `This action updates a #${id} order`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} order`;
  // }

  async changeStatus(changeStatusOrderDto: ChangeOrderStatusDto) {

    const { id, status } = changeStatusOrderDto;

    const order = await this.findOne(id);

    if (!order) {
      throw new RpcException({
        message: `Order with id ${id} not found.`,
        status: HttpStatus.NOT_FOUND
      })
    }


    if (order.status === status) {
      return order;
    }


    return this.order.update({
      where: { id },
      data: {
        status
      }
    })
  }

  async createPaymentSession (order: any)  {
    const paymentSession = await firstValueFrom(
      this.productsClient.send('create.payment.session', {
        currency: "usd",
        orderId: order.id,
        items: order.order.map(item => ({
          name: item.name,
          price: item.price,
          quantity: item.quantity
        }))
      })
    );

    return paymentSession;
  }

  async  paidOrder(paidOrderDto: PaidOrderDto) {
    this.logger.log('Order paid');
    this.logger.log(paidOrderDto);
  
    const updatedOrder= await this.order.update({
      where: {
        id: paidOrderDto.orderId,
      },
      data: {
        status: 'PAID',
        paid: true,
        paidAt: new Date(),
        stripeChargeId: paidOrderDto.stripePaymentId,

        //Relación
        //Esto se encarga de hacer la relación y la transacción
        OrderReceipt: {
          create: {
            receiptUrl: paidOrderDto.receiptUrl
          }
        }
      }
    });


    return updatedOrder;
    
  }

}
