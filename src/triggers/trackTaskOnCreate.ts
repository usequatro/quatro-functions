import * as functions from 'firebase-functions';
import Mixpanel from 'mixpanel';

import REGION from '../constants/region';
import { Task } from '../types/task';

import { TASKS_COLLECTION } from '../repositories/tasks';

export default functions
  .region(REGION)
  .firestore.document(`${TASKS_COLLECTION}/{taskId}`)
  .onCreate(async (change) => {
    const task = change.data() as Task;

    const mixpanel = Mixpanel.init(functions.config().mixpanel.token);
    mixpanel.track('Task Created', {
      distinct_id: task.userId,
      hasBlockers: Boolean(task.blockedBy && task.blockedBy.length > 0),
      hasScheduledStart: Boolean(task.scheduledStart),
      hasSnoozedUntil: Boolean(task.snoozedUntil),
      hasDueDate: Boolean(task.due),
      isRecurring: task.recurringConfigId,
      hasCalendarBlock: Boolean(task.calendarBlockStart && task.calendarBlockEnd),
      hasDescription: Boolean(task.description),
      impact: task.impact,
      effort: task.effort,
      source: task.source,
    });
  });
