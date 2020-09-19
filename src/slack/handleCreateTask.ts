import { Request, Response } from 'express';

import { create } from '../repositories/tasks';
import sendSlackResponse from './sendSlackResponse';
import { findBySlackUserId } from '../repositories/users';

const handleCreateTask = async (req: Request, res: Response): Promise<Response> => {
  const {
    text,
    user_id: slackUserId,
  } = req.body;

  try {
    const matches = /^\s*["“”]([^"“”]+)["“”] ([0-9]+) ([0-9]+)\s*$/.exec(text) || [];
    if (!matches.length) {
      throw new Error(`Invalid format. Received "${text}". Expected: [title] [impact] [effort]`);
    }
    const title: string | undefined = matches[1];
    const impact: string | undefined = matches[2];
    const effort: string | undefined = matches[3];

    if (!title) {
      throw new Error('Empty title');
    }
    if (!impact) {
      throw new Error('Empty impact');
    }
    if (!effort) {
      throw new Error('Empty effort');
    }

    const [userId] = await findBySlackUserId(slackUserId);

    const [taskId] = await create(userId, {
      title,
      impact: parseInt(impact, 10),
      effort: parseInt(effort, 10),
    });

    console.log(`[POST slack/task] Task created. id=${taskId}`);

    return sendSlackResponse(res, `Task created! "${title}" with impact ${impact} and effort ${effort}`);
  } catch (error) {
    console.log(`[POST slack/task] Task create error. message=${error.message}`);
    return sendSlackResponse(res, `Error: ${error.message}`);
  }
};

export default handleCreateTask;
