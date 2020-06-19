import { TypeOrmModuleOptions } from '@nestjs/typeorm';

export default (): Record<string, unknown> => ({
  database: {
    type: 'postgres',
    host: process.env.DB_HOSTNAME,
    port: Number(process.env.DB_PORT),
    username: process.env.POSTGRES_USER,
    password: process.env.POSTGRES_PASSWORD,
    database: process.env.POSTGRES_DB,
    entities: [__dirname + '/../**/*.entity.{js,ts}'],
    synchronize: Boolean(process.env.TYPEORM_SYNC === 'true'),
  } as TypeOrmModuleOptions,
});
