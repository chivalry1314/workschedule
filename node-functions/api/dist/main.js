import { createNestApp } from './bootstrap.js';
const app = await createNestApp();
await app.listen(process.env.PORT ?? 3000);
//# sourceMappingURL=main.js.map