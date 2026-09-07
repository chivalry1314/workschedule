import { createNestApp } from './dist/bootstrap.js';

const app = await createNestApp();
const server = app.getHttpAdapter().getInstance();

export default server;
