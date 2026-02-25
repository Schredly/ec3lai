import express from "express";
import { registerRoutes } from "./routes.js";

const app = express();
const port = parseInt(process.env.PORT || "5000", 10);

app.use(express.json());

registerRoutes(app);

app.listen(port, "0.0.0.0", () => {
  console.log(`EC3L server listening on port ${port}`);
});

export default app;
