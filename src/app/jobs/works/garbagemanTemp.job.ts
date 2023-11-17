import { resolve } from 'path';
import { isAfter, add } from 'date-fns';
import { readdirSync, unlinkSync } from 'fs';

export default class GarbagemanTemp {
  public static readonly key: string = 'GarbagemanTemp';

  public static readonly cronTime: string =
    process.env.CRONTABLE_GARBAGEMAN_TEMP || '0 0 0/4 1/1 * *';

  public static async handle(): Promise<void> {
    const tempPast = resolve(__dirname, '..', '..', '..', '..', 'temp');
    const files = await readdirSync(tempPast);

    const expiredFiles = files.filter(file => {
      const dotSplit = file.split('.');
      const snakeSplit = dotSplit[0].split('-');

      const timeFile = snakeSplit.pop();

      return isAfter(
        new Date(),
        add(parseInt(timeFile as string, 10), { hours: 24 }),
      );
    });

    const promises = expiredFiles.map(async file =>
      unlinkSync(resolve(tempPast, file)),
    );

    await Promise.all(promises);

    console.log('Cleaning of temporary files completed successfully');
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public static async onComplete(): Promise<void> {}
}
