import BoletoService from '../../service/boleto.service';

export default class Boleto {
  public static readonly key: string = 'BoletosJob';

  public static readonly cronTime: string =
    process.env.CRONTABLE_BOLETO || '0 7 9 1/1 * *';

  public static async handle(): Promise<void> {
    await BoletoService({});
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public static async onComplete(): Promise<void> {}
}
