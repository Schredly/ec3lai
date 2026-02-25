import "dotenv/config";
import express from "express";
import { registerRoutes } from "./routes.js";
import { setStorage } from "./storage.js";
import { setTenantStorageFactory } from "./tenantStorage.js";
import {
  DrizzleStorage,
  createDrizzleTenantStorage,
} from "./drizzleStorage.js";

// Initialize storage with real Drizzle/Postgres implementations
setStorage(new DrizzleStorage());
setTenantStorageFactory(createDrizzleTenantStorage);

const app = express();
const port = parseInt(process.env.PORT || "5000", 10);

app.use(express.json());

registerRoutes(app);

app.listen(port, "0.0.0.0", () => {
  console.log(`EC3L server listening on port ${port}`);
});

export default app;
