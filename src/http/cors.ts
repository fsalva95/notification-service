import type { RequestHandler } from 'express';

// Open to any origin so browser clients such as Swagger UI can call the API: there is no auth and no cookie.
export const cors: RequestHandler = (req, res, next) => {
  res.set({
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Expose-Headers': 'Location',
  });

  if (req.method === 'OPTIONS') {
    res.set({
      'Access-Control-Allow-Methods': 'GET, POST',
      'Access-Control-Allow-Headers': 'Content-Type',
    });
    res.sendStatus(204);
    return;
  }

  next();
};
