import Redis from 'ioredis';
import redisConfig from '../config/redis';

const redis = new Redis(redisConfig);

export default redis;
