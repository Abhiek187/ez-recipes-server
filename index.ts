import express from "express";

const app = express();

// Initialize middleware: parse JSON
app.use(express.json());

app.get("/", (req, res) => {
  return res.status(200).send({
    message: "Hello World!",
  });
});

// parseInt() requires a string, not undefined
const port = parseInt(`${process.env.PORT}`) || 5000;

app.listen(port, () => console.log(`Server listening on port ${port}...`));
