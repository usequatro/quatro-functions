import express from 'express';
import cors from 'cors';
import { findbyId, create } from './tasks';

const app = express();

// Automatically allow cross-origin requests
app.use(cors({ origin: true }));
app.use(express.json());

app.get('/task/:id', async (req, res) => {
  // @TODO: use signed secrets to ensure request comes from Slack

  const [task, errorCode, errorMessage] = await findbyId(req.params.id);
  if (errorCode) {
    res.status(errorCode).send({ message: errorMessage });
  }
  res.send(task);
});

app.post('/task', async (req, res) => {
  // @TODO: use signed secrets to ensure request comes from Slack

  const {
    text,
    // userId: slackUserId,
  } = req.body;

  const matches = /^\s*"([^"]+)" ([0-9]+) ([0-9]+)\s*$/.exec(text) || [];
  if (!matches.length) {
    res.status(400).send({ message: 'Invalid format' });
  }
  const title: string | undefined = matches[1];
  const impact: string | undefined = matches[2];
  const effort: string | undefined = matches[3];

  if (!title) {
    res.status(400).send({ message: 'Empty title' });
  }
  if (!impact) {
    res.status(400).send({ message: 'Empty impact' });
  }
  if (!effort) {
    res.status(400).send({ message: 'Empty effort' });
  }

  // @TODO: deharcode this, make it depend on the slack user sending the request.
  const userId = 'WyvyvhedV9NIzfsL9TMp331bJhE2';

  const [result = [], errorCode, errorMessage] = await create(userId, {
    title,
    impact: parseInt(impact, 10),
    effort: parseInt(effort, 10),
  });

  if (errorCode) {
    res.status(errorCode).send({ message: errorMessage });
  }
  const id: string = result[0];
  const task: object | undefined = result[1];

  res.send({
    id,
    task,
  });
});

export default app;
