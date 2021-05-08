import { Request, Response } from 'express';
import sendSlackResponse from './sendSlackResponse';
import { findByEmail, findBySlackUserId, setSlackUserId } from '../../repositories/users';

/**
 * @TODO: improve sign in
 * GitHub signin.js https://github.com/integrations/slack/blob/0cf2d12a7e307bb360b45265e90bcc8ef81e31ab/lib/slack/commands/signin.js
 */

const extractEmailAddress = (text: string): string | undefined => {
  // Slack format: <mailto:gpuenteallott+test1@gmail.com|gpuenteallott+test1@gmail.com>
  const matches = /^<mailto:([^@]+@[^@]+\.[a-z0-9]{1,4})\|.*>$/.exec(text);
  if (matches && matches[1]) {
    return matches[1];
  }
  // Simple email address case.
  if (/^[^@]+@[^@]+\.[a-z0-9]{1,4}$/.test(text)) {
    return text;
  }
  return undefined;
};

export const signin = async (req: Request, res: Response): Promise<Response> => {
  try {
    const { text, user_id: slackUserId } = req.body;
    const receivedEmail = text.replace(/^signin\s/, '').trim();
    const accountEmailAddress = extractEmailAddress(receivedEmail);

    if (!accountEmailAddress) {
      throw new Error(`Invalid format. Received "${text}". Expected: signin [email]`);
    }
    if (!slackUserId) {
      throw new Error('No Slack user ID');
    }

    try {
      const [alreadyConnectedUserId] = await findBySlackUserId(slackUserId);
      if (alreadyConnectedUserId) {
        throw new Error(
          'Slack account already connected. Sign out first before connecting to another email address',
        );
      }
    } catch (error) {
      //
    }

    const [userId] = await findByEmail(accountEmailAddress);
    await setSlackUserId(userId, slackUserId);

    console.log(`[POST slack/signin] Success. userId=${userId} slackUserId=${slackUserId}`);
    return sendSlackResponse(res, `Success, signed in to Quatro with ${accountEmailAddress}`);
  } catch (error) {
    console.log(`[POST slack/signin] Error. message=${error.message}`);
    return sendSlackResponse(res, `Error: ${error.message}`);
  }
};

export const signout = async (req: Request, res: Response): Promise<Response> => {
  try {
    const slackUserId: string = req.body.user_id;

    if (!slackUserId) {
      throw new Error('No Slack user ID');
    }

    const [userId] = await findBySlackUserId(slackUserId);

    if (!userId) {
      throw new Error('Slack user account was not connected already');
    }

    await setSlackUserId(userId, null);

    console.log(`[POST slack/signout] Success. userId=${userId} slackUserId=${slackUserId}`);
    return sendSlackResponse(res, 'Success, signed out of Quatro');
  } catch (error) {
    console.log(`[POST slack/signout] Error. message=${error.message}`);
    return sendSlackResponse(res, `Error: ${error.message}`);
  }
};
