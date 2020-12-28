import fetch from 'node-fetch';

type Headers = {
  [key: string]: string;
};

type Body = {
  [key: string]: unknown;
};

export const getRequest = (endpoint: string, headers: Headers): Promise<unknown> =>
  fetch(endpoint, {
    method: 'GET',
    headers,
  }).then((res) => res.json());

export const postRequest = (endpoint: string, headers: Headers, body: Body): Promise<unknown> =>
  fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  }).then((res) => res.json());

export const putRequest = (endpoint: string, headers: Headers, body: Body): Promise<unknown> =>
  fetch(endpoint, {
    method: 'PUT',
    headers,
    body: JSON.stringify(body),
  }).then((res) => res.json());

export const deleteRequest = (endpoint: string, headers: Headers): Promise<unknown> =>
  fetch(endpoint, {
    method: 'DELETE',
    headers,
  }).then((res) => res.json());
