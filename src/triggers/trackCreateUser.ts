import * as functions from 'firebase-functions';

import REGION from '../constants/region';
import { create } from '../repositories/tasks';

const ONBOARDING_TASKS = [
  {
    title: 'Connect Google Calendar',
    description:
      'Connecting your calendar will let you view your tasks and schedule side by side, and block time to give youself a chance to realistically plan your day',
    effort: 0,
    impact: 4,
  },
  {
    title: 'Schedule recurring tasks',
    description: 'Get all your daily or weekly rasks out of your head and onto your Top 4',
    effort: 0,
    impact: 3,
  },
  {
    title: 'Block time for your first task',
    description: 'Drag any task from your Top 4 into an open slot on your connected calendar',
    effort: 0,
    impact: 2,
  },
];

// @link https://firebase.google.com/docs/functions/auth-events
export default functions
  .region(REGION)
  .auth.user()
  .onCreate(async (user) => {
    const { uid } = user;

    ONBOARDING_TASKS.forEach((onboardingTask) => {
      create(uid, onboardingTask)
        .then((taskId) => {
          functions.logger.info('Created onboarding task', {
            uid,
            taskId,
            onboardingTask,
          });
        })
        .catch((error) => {
          functions.logger.error('Error creating onboarding task', {
            uid,
            error,
            onboardingTask,
          });
        });
    });
  });
