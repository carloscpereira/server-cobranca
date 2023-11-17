import DestroyContractService from '../../service/destroyContract.service';

export default class DestroyContract {
  public static readonly key: string = 'DestroyContractJob';

  public static readonly cronTime: string =
    process.env.CRONTABLE_DESTROY_CONTRACT || '0 7 9 1/1 * *';

  public static async handle(): Promise<void> {
    await DestroyContractService();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public static async onComplete(): Promise<void> {}
}
