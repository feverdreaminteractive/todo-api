import path from 'node:path';

export const config = {
  port: Number(process.env.PORT ?? 3000),
  dataFile: process.env.DATA_FILE ?? path.join(process.cwd(), 'data', 'todos.json'),
};
