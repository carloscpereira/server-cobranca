/* eslint-disable @typescript-eslint/no-explicit-any */
import { Job } from 'bull';

// eslint-disable-next-line import/no-duplicates
import { differenceInDays, format, parseISO } from 'date-fns';

// eslint-disable-next-line import/no-duplicates
import { ptBR } from 'date-fns/locale';

import { resolve } from 'path';
import { writeFileSync } from 'fs';

import apiGiga from '../../../utils/Giga';
import apiBB from '../../../utils/BancoBrasil';
import Queue from '../../../utils/Bull';
import Logger from '../../../utils/Logger';

import { capitalize, zeroToLeft, nomeSobrenome } from '../../helpers';

import { LogContatoRequest } from './logContato.queue';
import { RequestHandle as IBodyWhatsapp } from './whatsapp.queue';

export interface IEndereco {
  logradouro: string;
  bairro: string;
  cidade: string;
  estado: string;
  cep: string;
  complemento: string;
}

export interface ParcelaBody {
  id: string;
  estabelecimento: string;
  statuscontrato: string;
  operadora: string;
  nossonumero?: string;
  nome: string;
  email: string;
  telefone: string;
  whatsapp: string;
  vencimento: string;
  valor: number;
  endereco: IEndereco;
  documento: string;
  linhaDigitavel?: string;
  forceWhatsapp?: boolean;
  forceSMS?: boolean;
}

export interface BoletoBody {
  nossonumero: string;
  linhaDigitavel: string;
  codigoBarraNumerico?: string;
  isNew: boolean;
}

export default class BoletoQueue {
  public static readonly key: string = 'BoletoQueue';

  public static async handle({ data }: Job<any>): Promise<void> {
    const {
      email,
      nome,
      id,
      linhaDigitavel,
      nossonumero,
      telefone,
      whatsapp,
      documento,
      endereco,
      vencimento,
      valor,
      operadora,
      estabelecimento,
      forceWhatsapp = false,
      forceSMS = false,
      statuscontrato,
    }: ParcelaBody = data;

    const parseVencimentoToDate = parseISO(vencimento);

    const log = new Logger({
      route: `Queue/Boleto${operadora
        .toLowerCase()
        .replace(/(?:^|\s)\S/g, a => a.toUpperCase())}`,
    });

    const dataBoleto = {
      DataVencimento: parseVencimentoToDate,
      ValorBruto: valor,
      TipoTitulo: 4,
      Pagador: {
        Tipo: documento.length > 11 ? 2 : 1,
        Nome: nome,
        Documento: documento,
        Estado: endereco.estado,
        Cidade: endereco.cidade,
        Bairro: endereco.bairro,
        Endereco: endereco.logradouro,
        Cep: endereco.cep,
        ...(telefone ? { Telefone: telefone } : {}),
        ...(telefone ? { Email: email } : {}),
      },
    };

    const boleto: BoletoBody = {} as BoletoBody;

    if (
      parseInt(statuscontrato, 10) === 62 &&
      differenceInDays(parseVencimentoToDate, new Date()) > 5
    ) {
      return;
    }

    if (nossonumero && linhaDigitavel) {
      boleto.linhaDigitavel = linhaDigitavel;
      boleto.nossonumero = nossonumero;
      boleto.isNew = false;
    } else {
      const {
        data: { data: request },
      } = await apiBB.post(`/${estabelecimento}`, {
        ...dataBoleto,
        NossoNumero: id,
      });

      await apiGiga.put(`/parcelas/${operadora}/${id}`, {
        nossonumero: request.numero.substring(3),
        linhadigitavel: request.linhaDigitavel,
        codigobarras: request.codigoBarraNumerico,
      });

      boleto.linhaDigitavel = request.linhaDigitavel;
      boleto.nossonumero = request.numero;
      boleto.codigoBarraNumerico = request.codigoBarraNumerico;
      boleto.isNew = true;
    }

    if (!email) {
      const logEmail: LogContatoRequest = {
        is_error: true,
        operadora,
        parcela_id: parseInt(id, 10),
        response_request: `Não foi possível enviar um email para ${nome} porque ele(a) não tem um email principal cadastrado`,
        return_code: '500',
        tipo: 'Email',
      };

      Queue.add({ name: 'LogContatoQueue', data: logEmail });
      log.error(
        `Não foi possível enviar um email para ${nome} porque ele(a) não tem um email principal cadastrado`,
      );
    }

    const {
      data: { data: boletoBase64 },
    } = await apiBB.get(
      `/${estabelecimento}/${zeroToLeft({
        numero: boleto.nossonumero,
        size: 20,
      })}/render?format=base64`,
    );

    if (email) {
      Queue.add({
        name: 'MailQueue',
        data: {
          to: {
            name: capitalize(nome.toLowerCase()),
            email,
          },
          subject: `Seu Boleto ${operadora}`,
          template: 'boleto2',
          context: {
            layout: 'dashmix',
            nome,
            mes: format(parseVencimentoToDate, 'MMMM', {
              locale: ptBR,
            }),
            ano: format(parseVencimentoToDate, 'yyyy'),
          },
          attachments: [
            {
              filename: `boleto-${new Date().getTime()}.pdf`,
              content: boletoBase64,
              encoding: 'base64',
            },
          ],
          operadora,
          parcela: id,
        },
      });
    }

    if (forceSMS) {
      if (!telefone || telefone.length < 11) {
        const logSMS: LogContatoRequest = {
          is_error: true,
          operadora,
          parcela_id: parseInt(id, 10),
          response_request: `Não foi possível enviar um sms para ${nome} porque ele(a) não tem um telefone principal cadastrado`,
          return_code: '500',
          tipo: 'SMS',
        };
        Queue.add({ name: 'LogContatoQueue', data: logSMS });
        log.error(
          `Não foi possível enviar um sms para ${nome} porque ele(a) não tem um telefone principal cadastrado`,
        );
      }
      if (telefone && telefone.length === 11) {
        console.log('enviando sms');
        Queue.add({
          name: 'SMSQueue',
          data: {
            to: `55${telefone}`,
            message: `Seu Boleto ${operadora}: Segue a linha digitável para pagamento do seu boleto referente a parcela de ${format(
              parseVencimentoToDate,
              'MMMM',
              { locale: ptBR },
            )}/${format(parseVencimentoToDate, 'yyyy')}: ${
              boleto.linhaDigitavel
            }`,
            operadora,
            parcela: id,
          },
        });
      }
    }

    const validSendWhatsapp =
      differenceInDays(parseVencimentoToDate, new Date()) === 5 ||
      differenceInDays(parseVencimentoToDate, new Date()) === 0;

    if (validSendWhatsapp || forceWhatsapp) {
      try {
        //  Testa se o número é um número válido para Whatsapp
        if (
          (!telefone && !whatsapp) ||
          (telefone && !whatsapp && telefone.length < 11) ||
          (whatsapp && whatsapp.length < 11)
        ) {
          const logWPP: LogContatoRequest = {
            is_error: true,
            operadora,
            parcela_id: parseInt(id, 10),
            response_request: `Não foi possível enviar um whatsapp para ${nome} porque ele(a) não tem um telefone principal cadastrado ou não possui whatsapp`,
            return_code: '500',
            tipo: 'SMS',
          };

          Queue.add({ name: 'LogContatoQueue', data: logWPP });

          log.error(
            `Não foi possível enviar um whatsapp para ${nome} porque ele(a) não tem um telefone principal cadastrado ou não possui whatsapp`,
          );
        }

        const folder = resolve(__dirname, '..', '..', '..', '..', 'temp');
        const fileName = `Boleto-${operadora}-${new Date().getTime()}.pdf`;
        const fullUrl = process.env.BASE_URL_APP;

        const bin = Buffer.from(boletoBase64, 'base64');

        await writeFileSync(resolve(folder, fileName), bin);

        if (
          differenceInDays(parseVencimentoToDate, new Date()) === 5 ||
          forceWhatsapp ||
          boleto.isNew
        ) {
          const optionLocale = { locale: ptBR };

          const dateString = format(parseVencimentoToDate, 'dd/MM/yyyy');

          const parcelReference = format(
            parseVencimentoToDate,
            'MMMM/yyyy',
            optionLocale,
          );

          const message: IBodyWhatsapp = {
            to: whatsapp || telefone,
            operadora,
            message: `Olá, ${capitalize(nomeSobrenome(nome))}!\n\n
            Seu boleto Idental referente à parcela  ${parcelReference}, com vencimento em ${dateString},  está disponível para pagamento.\n\n
            Mantenha seu pagamento em dias, priorizando sempre o seu sorriso!`,
            file: `${fullUrl}/temp/${fileName}`,
            caption: fileName,
            parcela: parseInt(id, 10),
          };

          Queue.add({ name: 'WPPQueue', data: message });
        } else if (
          differenceInDays(parseVencimentoToDate, new Date()) === 0 &&
          !boleto.isNew
        ) {
          const message1: IBodyWhatsapp = {
            to: whatsapp || telefone,
            operadora,
            file: `${fullUrl}/public/${operadora}_wpp_send.png`,
            parcela: parseInt(id, 10),
          };

          Queue.add({ name: 'WPPQueue', data: message1 });

          // if (boleto.isNew) {
          //   const message2: IBodyWhatsapp = {
          //     to: whatsapp || telefone,
          //     operadora,
          //     file: `${fullUrl}/temp/${fileName}`,
          //     caption: fileName,
          //     parcela: parseInt(id, 10),
          //   };
          //   Queue.add({ name: 'WPPQueue', data: message2 });
          // }
        }
      } catch (error) {
        console.log(error);
        throw error;
      }
    }
  }
}
