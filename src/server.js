import express from 'express';
import ferramentasRouter from './routers/ferramentas.Routers.js';

const app = express();
const port = 3000;

app.use(express.json());

app.use('/ferramentas', ferramentasRouter);

app.listen(port, () => {
  console.log('app rodando em http://localhost:3000');
});
