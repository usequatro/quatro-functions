/**
 * Slack bot backend
 */

import express, { Request, Response } from 'express';
import cors from 'cors';

import { signin, signout } from './signin';
import handleCreateTask from './handleCreateTask';

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

/**
 * Slack sends a POST to the URL specified on the slack bot settings (inside slack platform).
 * The request POST parameters contain the action to take.
 */
app.post('/', async (req: Request, res: Response) => {
  console.log('[slack] Request body log.', req.body);

  // @TODO: use signed secrets to ensure request comes from Slack

  // text contains whatever was written after the slash command: /aizen [text]
  const { text } = req.body;

  switch (true) {
    case /^signin /.test(text):
      return signin(req, res);
    case /^signout/.test(text):
      return signout(req, res);
    default:
      return handleCreateTask(req, res);
  }
});

export default app;
