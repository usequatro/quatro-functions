// Use this endpoint to retrieve all Custom Fields
export const CUSTOM_FIELDS_URL = '/fields';
// Use this endpoint to retrieve all Lists
export const LISTS_URL = '/lists';
// Use this endpoint to retrieve all Tags
export const TAGS_URL = '/tags';
// Use this endpoint to create a new Contact
export const CONTACTS_URL = '/contacts';
// Use this endpoint to add values to a Contact's Custom Field
export const CUSTOM_FIELD_VALUES_URL = '/fieldValues';
// Use this endpoint to add/remove Tags from a Contact
export const CONTACT_TAGS_URL = '/contactTags';
// Use this endpoint to update the a Contact's List status
export const CONTACT_LISTS_URL = '/contactLists';

// Custom Lists
export const MAIN_LIST = {
  id: '1',
  name: 'Main List',
};
export const DEVELOPMENT_LIST = {
  id: '2',
  name: 'Development List',
};

// Custom Tags
export const SIGNED_PASSWORD_TAG = {
  id: '1',
  tag: 'Signed in with password',
};
export const SIGNED_GOOGLE_TAG = {
  id: '2',
  tag: 'Signed in with Google',
};

// Custom Fields
export const CALENDARS_FIELD = {
  id: '1',
  title: 'Number of connected calendars',
};
