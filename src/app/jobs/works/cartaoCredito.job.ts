import CartaoCreditoService from '../../service/cartaoCredito.service';

export default class CartaoCredito {
  public static readonly key: string = 'CartaoCreditoJob';

  public static readonly cronTime: string =
    process.env.CRONTABLE_CARTAOCREDITO || '0 7 9 1/1 * *';

  public static async handle(): Promise<void> {
    await CartaoCreditoService();
  }

  // eslint-disable-next-line @typescript-eslint/no-empty-function
  public static async onComplete(): Promise<void> {}
}
