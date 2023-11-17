/* eslint-disable @typescript-eslint/ban-types */
import { CronJob } from 'cron';
import moment from 'moment';

import Logger from './Logger';

import * as jobs from '../app/jobs/works';

interface WorksBody {
  cronTime?: string;
  handle: void;
  onComplete: void;
  key: string;
}

interface JobsBody {
  cron: CronJob;
  name: string;
  handle: Function;
}

class Cron {
  private readonly jobs: Array<JobsBody>;

  private readonly log: Logger;

  constructor() {
    this.log = new Logger({ route: 'Cron' });

    this.jobs = Object.values(jobs).map(
      ({ key: name, onComplete, handle, cronTime }) => ({
        cron: new CronJob(
          cronTime,
          handle,
          onComplete,
          true,
          'America/Sao_Paulo',
        ),
        handle,
        name,
      }),
    );
  }

  init(name?: string): void {
    if (!name) {
      this.jobs.forEach(c => {
        c.cron.start();
        this.log.info(
          `the next ${c.name} run will be at ${c.cron
            .nextDate()
            .format('llll')}`,
        );
      });
    } else {
      const job = this.jobs.find(c => c.name === name);

      job?.cron.start();
      this.log.info(
        `the next ${job?.name} run will be at ${job?.cron
          .nextDate()
          .format('llll')}`,
      );
    }
  }

  stop(name?: string): void {
    if (!name) this.jobs.forEach(c => c.cron.stop());
    else this.jobs.find(c => c.name === name)?.cron.stop();
  }

  cron(name?: string): CronJob | null | undefined {
    if (!name) return null;
    const cron = this.jobs.find(c => c.name === name)?.cron;

    return cron;
  }
}

export default new Cron();
