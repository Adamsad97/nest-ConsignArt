import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { join } from 'path';

dotenv.config();

const isDockerConfig = process.env.DB_HOST === 'db';
const dbHost = isDockerConfig
  ? 'localhost'
  : (process.env.DB_HOST ?? 'localhost');
const dbPort = isDockerConfig
  ? 5434
  : parseInt(process.env.DB_PORT ?? '5432', 10);

export const AppDataSource = new DataSource({
  type: 'postgres',
  host: dbHost,
  port: dbPort,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  entities: [join(__dirname, '..', '**', '*.entity.{ts,js}')],
  migrations: [join(__dirname, 'migrations', '*.{ts,js}')],
  migrationsTableName: 'typeorm_migrations',
});
