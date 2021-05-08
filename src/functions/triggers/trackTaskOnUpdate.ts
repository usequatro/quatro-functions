import * as functions from 'firebase-functions';
import Mixpanel from 'mixpanel';
import isEqual from 'lodash/isEqual';

import REGION from '../../constants/region';
import { Task } from '../../types/task';

import { TASKS_COLLECTION } from '../../repositories/tasks';

export default functions
  .region(REGION)
  .firestore.document(`${TASKS_COLLECTION}/{taskId}`)
  .onUpdate(async (change) => {
    const beforeTask = change.before.data() as Task;
    const afterTask = change.after.data() as Task;

    const getMixpanel = (() => {
      let mixpanel: Mixpanel.Mixpanel;
      return () => {
        if (!mixpanel) {
          mixpanel = Mixpanel.init(functions.config().mixpanel.token);
        }
        return mixpanel;
      };
    })();

    if (!beforeTask.completed && afterTask.completed) {
      const mixpanel = getMixpanel();
      mixpanel.track('Task Completed', {
        distinct_id: afterTask.userId,
        source: afterTask.source,
      });
    }

    if (beforeTask.completed && !afterTask.completed) {
      const mixpanel = getMixpanel();
      mixpanel.track('Task Incompleted', {
        distinct_id: afterTask.userId,
        source: afterTask.source,
      });
    }

    const titleChanged = beforeTask.title !== afterTask.title;
    const descriptionChanged = beforeTask.description !== afterTask.description;
    const scheduledStartChanged = beforeTask.scheduledStart !== afterTask.scheduledStart;
    const blockedByChanged = !isEqual(beforeTask.blockedBy, afterTask.blockedBy);
    const dueChanged = beforeTask.due !== afterTask.due;
    const effortChanged = beforeTask.effort !== afterTask.effort;
    const impactChanged = beforeTask.impact !== afterTask.impact;
    if (
      titleChanged ||
      descriptionChanged ||
      scheduledStartChanged ||
      blockedByChanged ||
      dueChanged ||
      effortChanged ||
      impactChanged
    ) {
      const mixpanel = getMixpanel();
      mixpanel.track('Task Updated', {
        distinct_id: afterTask.userId,
        source: afterTask.source,
        titleChanged,
        descriptionChanged,
        scheduledStartChanged,
        blockedByChanged,
        dueChanged,
        effortChanged,
        impactChanged,
      });
    }

    if (!beforeTask.snoozedUntil && afterTask.snoozedUntil) {
      const mixpanel = getMixpanel();
      mixpanel.track('Task Snoozed', {
        distinct_id: afterTask.userId,
        source: afterTask.source,
      });
    }

    if (beforeTask.snoozedUntil && !afterTask.snoozedUntil) {
      const mixpanel = getMixpanel();
      mixpanel.track('Task Snooze Cleared', {
        distinct_id: afterTask.userId,
        source: afterTask.source,
      });
    }

    if (
      afterTask.prioritizedAheadOf &&
      beforeTask.prioritizedAheadOf !== afterTask.prioritizedAheadOf
    ) {
      const mixpanel = getMixpanel();
      mixpanel.track('Task Manually Arranged', {
        distinct_id: afterTask.userId,
        source: afterTask.source,
      });
    }
  });
