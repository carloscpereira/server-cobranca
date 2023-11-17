import { Router } from 'express';
import { AuthMiddleware, CheckChatProMiddleware } from '../app/middlewares';

import BoletoController from '../app/controllers/boletoController';
import JobBoletoController from '../app/controllers/jobBoletoController';

const routes = Router();

routes.get('/ping', (request, response) => {
  response.send('pong!');
});

routes.get('/boleto', (request, response) =>
  response.render('boleto2', { layout: 'dashmix' }),
);

routes.get('/debug-sentry', (request, response) => {
  throw new Error('My first Sentry error!');
});

routes.post('/jobs/boleto', AuthMiddleware, JobBoletoController.index);

routes.post(
  '/:operadora/send-boleto/email',
  AuthMiddleware,
  BoletoController.sendEmail,
);

routes.post(
  '/:operadora/send-boleto/whatsapp',
  AuthMiddleware,
  CheckChatProMiddleware,
  BoletoController.sendWhatsapp,
);

routes.post(
  '/:operadora/send-boleto/:id',
  AuthMiddleware,
  BoletoController.store,
);

export default routes;
