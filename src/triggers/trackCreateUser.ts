import * as functions from 'firebase-functions';

import REGION from '../constants/region';
import { create } from '../repositories/tasks';

const ONBOARDING_TASKS = [
  {
    title: 'Connect Google Calendar',
    description: 'Connecting your calendar will let you view your tasks and schedule side by side',
    effort: 0,
    impact: 4,
  },
  {
    title: 'Schedule recurring tasks',
    description: 'Get all of your daily or weekly tasks out of your head and into your Top 4',
    effort: 0,
    impact: 3,
  },
  {
    title: 'Block time for your first task',
    description:
      'After connecting your calendar, drag any task from your Top 4 into an open time slot to create a time block',
    effort: 0,
    impact: 2,
  },
  {
    title: 'Add Quatro as a bookmark on your desktop',
    description: '',
    effort: 0,
    impact: 1,
  },
  {
    title: 'Add Quatro to your phone’s home screen',
    description:
      'For some helpful Quatro content, like how to create a native mobile app experience, check out our FAQ at https://usequatro.com/faq',
    effort: 0,
    impact: 0,
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
