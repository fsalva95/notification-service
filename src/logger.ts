type Fields = Record<string, unknown>;

export interface Logger {
  info(message: string, fields?: Fields): void;
  error(message: string, fields?: Fields): void;
}

// JSON.stringify turns an Error into {}.
const serializeErrors = (_key: string, value: unknown) =>
  value instanceof Error ? { name: value.name, message: value.message, stack: value.stack } : value;

export function createLogger(): Logger {
  const write = (level: string, message: string, fields: Fields = {}) =>
    console.log(JSON.stringify({ time: new Date().toISOString(), level, message, ...fields }, serializeErrors));

  return {
    info: (message, fields) => write('info', message, fields),
    error: (message, fields) => write('error', message, fields),
  };
}
