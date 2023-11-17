import { Request, Response, NextFunction } from 'express';
import WPP from '../../utils/WPP';

import AppError from '../../errors/AppError';

export default async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<Response | void> => {
  console.log('Eu estou aqui');
  const status = await WPP.isOn();

  if (!status) throw new AppError('Celular desconectado');

  return next();
};
