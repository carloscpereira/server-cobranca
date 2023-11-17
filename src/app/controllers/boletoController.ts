import { Request, Response } from 'express';
import { resolve } from 'path';
import { writeFileSync, unlinkSync } from 'fs';
import ptBR, { format, parse } from 'date-fns';

import apiBB from '../../utils/BancoBrasil';

import apiGiga from '../../utils/Giga';
import Bull from '../../utils/Bull';
import { ParcelaBody } from '../jobs/queues/boleto.queue';

export default class BoletoController {
  public static async store(
    request: Request,
    response: Response,
  ): Promise<void | Response> {
    const {
      params: { id, operadora },
      query: {
        send_sms = true,
        send_whatsapp = true,
        email = null,
        telefone = null,
        whatsapp = null,
      },
    } = request;

    const {
      data: { data: dataResponse },
    } = await apiGiga.get('/parcelas', {
      params: {
        limit: 2,
        operadora,
        contrato_statusid: '8,62',
        parcela_statusid: 1,
        contrato_tipoid: '5,9',
        parcela_id: id,
      },
    });

    if (dataResponse?.length === 0 || !dataResponse)
      return response.status(400).json({
        error: 400,
        message:
          'A parcela não foi encontrada. Ela pode já estar quitada, de um contrato inativo ou pode não existir',
      });

    const parcela = dataResponse.shift();

    const parcelaBody: ParcelaBody = {
      documento: parcela.rf_documento,
      operadora,
      estabelecimento: operadora,
      email: email || parcela.rf_email,
      telefone: telefone || parcela.rf_numero,
      whatsapp: whatsapp || parcela.rf_whatsapp || parcela.rf_numero,
      endereco: {
        bairro: parcela.rf_endereco_bairro,
        cep: parcela.rf_endereco_cep,
        cidade: parcela.rf_endereco_cidade,
        complemento: parcela.rf_endereco_complemento,
        estado: parcela.rf_endereco_estado,
        logradouro: parcela.rf_endereco_logradouro,
      },
      id,
      nome: parcela.rf_nome,
      valor: parcela.parcela_valor,
      vencimento: parcela.parcela_vencimento,
      linhaDigitavel: parcela.boleto_linhadigitavel,
      nossonumero: parcela.boleto_nossonumero,
      forceSMS: send_sms !== 'false',
      forceWhatsapp: send_whatsapp !== 'false',
      statuscontrato: '8',
    };

    Bull.add({ name: 'BoletoQueue', data: parcelaBody });

    return response.status(202).json({
      error: 202,
      message:
        'Parcela enviada para fila de processamento de envio com sucesso',
    });
  }

  public static async sendWhatsapp(
    request: Request,
    response: Response,
  ): Promise<void | Response> {
    const { destinatario, mensagem, nome, nosso_numero } = request.body;
    const { operadora } = request.params;

    console.log(request.body);

    const folder = resolve(__dirname, '..', '..', '..', 'temp');
    const fileName = `Boleto-${operadora}-${new Date().getTime()}.pdf`;
    const fullUrl =
      process.env.BASE_URL_APP ||
      `${request.protocol}://${request.get('host')}`;

    try {
      const {
        data: { data: boletoBase64 },
      } = await apiBB.get(
        `/${operadora}/${nosso_numero.padStart(20, '0')}/render?format=base64`,
      );

      const bin = Buffer.from(boletoBase64, 'base64');

      await writeFileSync(resolve(folder, fileName), bin);

      const body = {
        to: destinatario,
        message:
          mensagem ||
          `Olá *${nome}*! Tudo bem? \nSegue abaixo o seu boleto bancário referente ao plano odontológico da operadora *${operadora}*`,
        operadora,
        file: `${fullUrl}/temp/${fileName}`,
        caption: fileName,
      };

      Bull.add({ name: 'WPPQueue', data: body });

      return response.status(200).json({ success: true });
    } catch (error) {
      return response.status(500).json(error);
    } finally {
      setTimeout(() => {
        unlinkSync(resolve(folder, fileName));
      }, 60000);
    }
  }

  public static async sendEmail(
    request: Request,
    response: Response,
  ): Promise<void | Response> {
    const {
      destinatario,
      parcela_id,
      nome,
      nosso_numero,
      vencimento,
    } = request.body;
    const { operadora } = request.params;

    const parseVencimentoToDate =
      vencimento && parse(vencimento, 'yyyy-MM-dd', new Date());

    const folder = resolve(__dirname, '..', '..', '..', 'temp');
    const fileName = `Boleto-${operadora}-${new Date().getTime()}.pdf`;

    try {
      const {
        data: { data: boletoBase64 },
      } = await apiBB.get(
        `/${operadora}/${nosso_numero.padStart(20, '0')}/render?format=base64`,
      );

      const body = {
        to: {
          name: nome,
          email: destinatario,
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
        parcela: parcela_id,
      };

      Bull.add({ name: 'MailQueue', data: body });

      return response.status(200).json({ success: true });
    } catch (error) {
      return response.status(500).json(error);
    } finally {
      setTimeout(() => {
        unlinkSync(resolve(folder, fileName));
      }, 60000);
    }
  }
}
