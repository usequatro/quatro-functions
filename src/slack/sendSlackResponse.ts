import { Response } from 'express';

export default (res: Response, text: string, responseType = 'ephemeral'): Response => (
  res.status(200).send({
    response_type: responseType,
    text,
  })
);
