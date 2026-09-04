import { createApp } from './app';
import { JsonFileTodoRepository } from './repository/json-file-todo-repository';
import { config } from './config';

const repository = new JsonFileTodoRepository(config.dataFile);
const app = createApp(repository);

app.listen(config.port, () => {
  console.log(`Listening on port ${config.port}`);
});
