const express = require('express');
const cors = require('cors');
const productsRouter = require('./routes/products');
const designsRouter = require('./routes/designs');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/products', productsRouter);
app.use('/api/designs', designsRouter);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend running on http://localhost:${PORT}`));
