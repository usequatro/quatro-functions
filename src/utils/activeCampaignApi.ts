import * as functions from 'firebase-functions';
import { deleteRequest, getRequest, postRequest } from './fetch';
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

const { url, key } = functions.config().activecampaign || {};
if (!url) {
  throw new Error('No env var activecampaign.url');
}
if (!key) {
  throw new Error('No env var activecampaign.key');
}

const buildUrl = (path: string): string => `${url}/api/3${path}`;
const acHeaders: { [key: string]: string } = {
  'Api-Token': key,
};

export const getAllLists = async (): Promise<AcListResponse> =>
  getRequest(buildUrl('/lists'), acHeaders) as Promise<AcListResponse>;

export const getAllCustomFields = async (): Promise<AcCustomFieldResponse> =>
  getRequest(buildUrl('/fields'), acHeaders) as Promise<AcCustomFieldResponse>;

export const getAllTags = async (): Promise<AcTagsResponse> =>
  getRequest(buildUrl('/tags'), acHeaders) as Promise<AcTagsResponse>;

export const createContact = async (contact: AcContactPayload): Promise<AcContactResponse> =>
  postRequest(buildUrl('/contacts'), acHeaders, contact) as Promise<AcContactResponse>;

export const deleteContact = async (id: string): Promise<AcContactResponse> =>
  deleteRequest(buildUrl(`/contacts/${id}`), acHeaders) as Promise<AcContactResponse>;

export const addContactToList = async (
  contactList: AcContactListPayload,
): Promise<AcContactListResponse> =>
  postRequest(buildUrl('/contactLists'), acHeaders, contactList) as Promise<AcContactListResponse>;

// Use this endpoint to add values to a Contact's Custom Field
export const addCustomFieldValue = async (
  fieldValue: AcFieldValuePayload,
): Promise<AcFieldValueResponse> =>
  postRequest(buildUrl('/fieldValues'), acHeaders, fieldValue) as Promise<AcFieldValueResponse>;

export const addTagToUser = async (
  contactTag: AcContactTagPayload,
): Promise<AcContactTagResponse> =>
  postRequest(buildUrl('/contactTags'), acHeaders, contactTag) as Promise<AcContactTagResponse>;
