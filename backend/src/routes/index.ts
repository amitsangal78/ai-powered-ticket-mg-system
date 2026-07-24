import { Router, type IRouter } from 'express';
import { healthRouter } from './health.js';

export const apiRouter: IRouter = Router();

apiRouter.use(healthRouter);

// Wave 2+: auth, tickets, users routes mount here
