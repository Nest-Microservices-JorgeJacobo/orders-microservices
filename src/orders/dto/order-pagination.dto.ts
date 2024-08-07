import { IsEnum, IsOptional } from "class-validator";

import {  OrderStatusList } from "../enum/order.enum";

import { OrderStatus } from "@prisma/client";
import { PaginationDto } from "src/common";

export class OrderPaginationDto extends PaginationDto {

    @IsOptional()
    @IsEnum(OrderStatusList, {
        message: `Valid order status are ${OrderStatusList}`
    })
    status: OrderStatus;
}