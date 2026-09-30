const express = require("express");
const cors = require("cors");
const path = require("path");
const recipesRouter = require("./routes/recipes");
const authRouter = require("./routes/auth");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "32kb" }));
app.get(["/", "/index.html", "/recipe.html"], authRouter.requirePageAuth);
app.use(express.static(path.join(__dirname, "../public")));
app.use("/api/auth", authRouter);

app.get("/mock-data.json", (req, res) => {
  res.sendFile(path.join(__dirname, "../mock-data.json"));
});

app.use("/api", recipesRouter);

app.use("/api", (req, res) => {
  res.status(404).json({ error: "Not found." });
});

app.use((err, req, res, next) => {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || "Internal server error." });
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`FridgeChef running at http://localhost:${PORT}`);
  });
}

module.exports = app;
