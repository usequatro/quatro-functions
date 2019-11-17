/**
 * This migration is to apply a transformation on a key value for all task entities.
 *
 * ⚠️ ⚠️ ⚠️
 * Need to improve this, here we're currently retrieving ALL tasks, which consumes a lot of
 * Firestore calls.
 */

const COLLECTION = 'tasks';

const LIMIT = 1000;

export default (
  db: any,
  key: string,
  transformFunction: (value: any) => any,
) => {
  return db.collection(COLLECTION)
    .limit(LIMIT)
    .get()
    .then(async (querySnapshot: any) => {
      for (let i = 0; i < querySnapshot.docs.length; i++) {
        const id = querySnapshot.docs[i].id;
        const data = querySnapshot.docs[i].data();

        const {
          [key]: oldValue,
          ...restData
        } = data;

        const newValue = transformFunction(oldValue);

        const newData = {
          ...restData,
          [key]: newValue,
        };

        await db.collection(COLLECTION).doc(id).set(newData, { merge: false });
      }
    });
};
