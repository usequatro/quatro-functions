import constants from '../constants/common';
import {
  LISTS_URL,
  CUSTOM_FIELDS_URL,
  TAGS_URL,
  CONTACTS_URL,
  CONTACT_LISTS_URL,
  CUSTOM_FIELD_VALUES_URL,
  CONTACT_TAGS_URL,
} from '../constants/activeCampaign';
import { getRequest, postRequest } from '../utils/fetch';
import {
  AcListResponse,
  AcCustomFieldResponse,
  AcTagsResponse,
  AcContactPayload,
  AcContactResponse,
  AcContactListPayload,
  AcContactListResponse,
  AcFieldValuePayload,
  AcFieldValueResponse,
  AcContactTagPayload,
  AcContactTagResponse,
} from '../types';

const buildUrl = (path: string): string => `${constants.acBaseUrl}${path}`;
const acHeaders: { [key: string]: string } = {
  'Api-Token': constants.acApiKey,
};

export const getAllLists = async (): Promise<AcListResponse> =>
  getRequest(buildUrl(LISTS_URL), acHeaders) as Promise<AcListResponse>;

export const getAllCustomFields = async (): Promise<AcCustomFieldResponse> =>
  getRequest(buildUrl(CUSTOM_FIELDS_URL), acHeaders) as Promise<AcCustomFieldResponse>;

export const getAllTags = async (): Promise<AcTagsResponse> =>
  getRequest(buildUrl(TAGS_URL), acHeaders) as Promise<AcTagsResponse>;

export const createContact = async (contact: AcContactPayload): Promise<AcContactResponse> =>
  postRequest(buildUrl(CONTACTS_URL), acHeaders, contact) as Promise<AcContactResponse>;

export const addContactToList = async (
  contactList: AcContactListPayload,
): Promise<AcContactListResponse> =>
  postRequest(
    buildUrl(CONTACT_LISTS_URL),
    acHeaders,
    contactList,
  ) as Promise<AcContactListResponse>;

export const addCustomFieldValue = async (
  fieldValue: AcFieldValuePayload,
): Promise<AcFieldValueResponse> =>
  postRequest(
    buildUrl(CUSTOM_FIELD_VALUES_URL),
    acHeaders,
    fieldValue,
  ) as Promise<AcFieldValueResponse>;

export const addTagToUser = async (
  contactTag: AcContactTagPayload,
): Promise<AcContactTagResponse> =>
  postRequest(buildUrl(CONTACT_TAGS_URL), acHeaders, contactTag) as Promise<AcContactTagResponse>;
