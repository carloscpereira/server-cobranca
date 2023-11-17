import { Request, Response } from 'express';
import { dateStringValidation, dateStringFormatting } from '../helpers';

import BoletoService from '../service/boleto.service';

import AppError from '../../errors/AppError';
import { tr } from 'date-fns/locale';

interface IBodyRequest {
  parcela_validade: string | null;
  send_mail: boolean;
  send_sms: boolean;
  send_whatsapp: boolean;
}

export default class JobBoletoController {
  static async index(request: Request, response: Response): Promise<Response> {
    const {
      parcela_validade: parcelaValidade = null,
      send_mail: sendMail = false,
      send_whatsapp: sendWhatsapp = false,
      send_sms: sendSMS = false,
    }: IBodyRequest = request.body;

    const dateValidation = parcelaValidade
      ? dateStringValidation({
          dates: parcelaValidade,
        })
      : undefined;

    if (!!parcelaValidade && !dateValidation) {
      throw new AppError(
        'The dates provided are in an invalid format, please format the dates correctly: dd/mm/yyyy',
      );
    }

    const datesFormated = parcelaValidade
      ? dateStringFormatting({
          dates: parcelaValidade,
          separator: { to: ',', from: ',' },
          formatting: { to: 'dd/MM/yyyy', from: 'dd/MM/yyyy' },
        })
      : undefined;

    const dates =
      !parcelaValidade || parcelaValidade.length === 0
        ? undefined
        : datesFormated;

    try {
      BoletoService({ sendSMS, sendMail, sendWhatsapp, dates });
    } catch (error) {
      console.log(error);
    }

    return response.sendStatus(202);
  }
}
