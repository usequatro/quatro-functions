import * as functions from 'firebase-functions';
import Mixpanel from 'mixpanel';

import REGION from '../constants/region';
import { Task } from '../types/task';

import { TASKS_COLLECTION } from '../repositories/tasks';

export default functions
  .region(REGION)
  .firestore.document(`${TASKS_COLLECTION}/{taskId}`)
  .onDelete(async (change) => {
    const task = change.data() as Task;

    const mixpanel = Mixpanel.init(functions.config().mixpanel.token);
    mixpanel.track('Task Deleted', {
      distinct_id: task.userId,
      source: task.source,
    });
  });
