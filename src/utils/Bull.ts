/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/ban-types */
import Queue, {
  Queue as IQueue,
  JobOptions,
  Job,
  ProcessPromiseFunction,
} from 'bull';
import { setQueues } from 'bull-board';
import redisConfig from '../config/redis';

import * as jobs from '../app/jobs/queues';

interface QueueBody {
  name: string;
  handle: ProcessPromiseFunction<void>;
  bull: IQueue<any>;
}

interface AddBody {
  name: string;
  data: object;
  options?: JobOptions;
}

class Bull {
  public queues: Array<QueueBody>;

  constructor() {
    this.queues = Object.values(jobs).map(({ key: name, handle }) => ({
      name,
      handle,
      bull: new Queue(name, {
        redis: {
          port: redisConfig.port,
          host: redisConfig.host,
        },
      }),
    }));

    setQueues(this.queues.map(({ bull }) => bull));
  }

  public process() {
    return this.queues.forEach(({ bull, handle }) => {
      bull.process(handle);
    });
  }

  public async add({
    name,
    data,
    options = {} as JobOptions,
  }: AddBody): Promise<Job | null> {
    const queue = this.queues.find(q => q.name === name);

    if (!queue) return null;
    return queue?.bull.add(data, options);
  }

  public get(name: string): IQueue | undefined {
    const queue = this.queues.find(q => q.name === name);

    return queue?.bull;
  }
}

export default new Bull();
