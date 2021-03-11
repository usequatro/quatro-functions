import * as functions from 'firebase-functions';

// import { deleteContact } from '../utils/activeCampaignApi';
import REGION from '../constants/region';
import {
  deleteUserInternalConfig,
  // getUserInternalConfig,
} from '../repositories/userInternalConfigs';
import { deleteUserExternalConfig } from '../repositories/userExternalConfigs';
import { deleteCalendar, findCalendarsByUserId } from '../repositories/calendars';
import {
  deleteRecurringConfig,
  findRecurringConfigsByUserId,
} from '../repositories/recurringConfigs';
import { deleteTask, findTasksByUserId } from '../repositories/tasks';

// @link https://firebase.google.com/docs/functions/auth-events
export default functions
  .region(REGION)
  .auth.user()
  .onDelete(async (user) => {
    const { uid } = user;

    // const userInternalConfig = await getUserInternalConfig(uid);
    // if (userInternalConfig) {
    //   const { activeCampaignContactId } = userInternalConfig;
    //   if (activeCampaignContactId) {
    //     await deleteContact(activeCampaignContactId);
    //     functions.logger.info('Deleted ActiveCampaign contact for user', {
    //       userId: user.uid,
    //       userEmail: user.email,
    //       activeCampaignContactId,
    //     });
    //   } else {
    //     functions.logger.info('Skipping because no ActiveCampaign contact ID', {
    //       userId: user.uid,
    //       userEmail: user.email,
    //     });
    //   }
    // } else {
    //   functions.logger.info('Skipping AC deletion because user internal config not found', {
    //     userId: user.uid,
    //     userEmail: user.email,
    //   });
    // }

    await deleteUserInternalConfig(uid);
    await deleteUserExternalConfig(uid);
    const userCalendars = await findCalendarsByUserId(uid);
    for (const [id] of userCalendars) {
      await deleteCalendar(id);
    }
    const userRecurringConfigs = await findRecurringConfigsByUserId(uid);
    for (const [id] of userRecurringConfigs) {
      await deleteRecurringConfig(id);
    }
    const userTasks = await findTasksByUserId(uid);
    for (const [id] of userTasks) {
      await deleteTask(id);
    }

    functions.logger.info('Deleted user', {
      userId: user.uid,
      userEmail: user.email,
      taskCount: userTasks.length,
      recurringConfigCount: userRecurringConfigs.length,
      calendarCount: userCalendars.length,
    });
  });
