


import 'dotenv/config';
import * as joi from 'joi';

interface EnvVars {
    PORT: number;
    DATABASE_URL: string;

    // PRODUCTS_MICROSERVICES_HOST: string;
    // PRODUCTS_MICROSERVICES_PORT: number;
    NATS_SERVERS: string[];
}

const envSchema = joi.object({
    PORT: joi.number().required(),
    // PRODUCTS_MICROSERVICES_HOST: joi.string().required(),
    // PRODUCTS_MICROSERVICES_PORT: joi.number().required(),
    NATS_SERVERS: joi.array().items(joi.string()).required()
}).unknown(true);

const {error, value} = envSchema.validate({
    ...process.env,
    NATS_SERVERS: process.env.NATS_SERVERS?.split(',')
});


if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const envVars: EnvVars = value;

export const envs = {
    port: envVars.PORT,
    // productsMicroservicesHost: envVars.PRODUCTS_MICROSERVICES_HOST,
    // productsMicroservicesPort: envVars.PRODUCTS_MICROSERVICES_PORT
    natServers: envVars.NATS_SERVERS
}