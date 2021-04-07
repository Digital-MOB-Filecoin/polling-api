import * as dotenv from 'dotenv';

dotenv.config();

export = [{
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE_NAME,
  entities: ['src/**/*.entity.ts'],
  logging: 'all',
  migrationsTableName: '_migrations',
  migrations: ['migrations/*.ts'],
  cli: {
    migrationsDir: 'migrations'
  }
}];