import * as functions from 'firebase-functions';

import REGION from '../constants/region';
import { Task } from '../types';

const areDifferent = (taskA: Task, taskB: Task) =>
  taskA.title !== taskB.title ||
  taskA.description !== taskB.description ||
  taskA.completed !== taskB.completed ||
  taskA.calendarBlockStart !== taskB.calendarBlockStart ||
  taskA.calendarBlockEnd !== taskB.calendarBlockEnd;

// https://firebase.google.com/docs/functions/firestore-events
export default functions
  .region(REGION)
  .firestore.document('tasks/{taskId}')
  .onWrite(async (change /*, context */) => {
    const taskBefore = change.before.exists ? (change.before.data() as Task) : null;
    const taskAfter = change.after.exists ? (change.after.data() as Task) : null;

    // Deletion
    if (taskBefore && !taskAfter) {
      // Check if task had a connected calendar event, and delete it too
    }

    // Creation
    if (!taskBefore && taskAfter && taskAfter.calendarBlockStart && taskAfter.calendarBlockEnd) {
      // Check if task has a time block, and create event for it if so
    }

    // Moving to different calendar
    if (
      taskAfter &&
      taskBefore &&
      taskBefore.calendarBlockCalendarId !== taskAfter.calendarBlockCalendarId
    ) {
      // Perform the moving
    }

    // Same calendar, just made some changes
    if (
      taskBefore &&
      taskAfter &&
      taskBefore.calendarBlockCalendarId === taskAfter.calendarBlockCalendarId &&
      areDifferent(taskBefore, taskAfter)
    ) {
      // Perform a patch
    }
  });
