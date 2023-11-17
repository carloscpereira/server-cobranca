export default {
  host: process.env.REDIS_HOST,
  port: process.env.REDIS_PORT
    ? parseInt(process.env.REDIS_PORT, 10)
    : undefined,
  family: process.env.REDIS_FAMILY ? parseInt(process.env.REDIS_FAMILY, 10) : 4,
};
