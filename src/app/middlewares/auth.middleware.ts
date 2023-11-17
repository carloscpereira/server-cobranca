import { Request, Response, NextFunction } from 'express';

export default async (
  request: Request,
  response: Response,
  next: NextFunction,
): Promise<Response | void> => {
  const {
    headers: { appauthorization },
  } = request;

  if (!appauthorization || appauthorization !== process.env.APP_KEY) {
    return response
      .status(401)
      .json({ error: 401, data: { message: 'Unauthorized' } });
  }
  return next();
};
