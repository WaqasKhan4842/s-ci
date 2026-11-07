import express from 'express';

const app = express();
const port = 3000;

app.get('/say-hi', (req, res) => {
  res.send('Hello, Sue Will!');
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
