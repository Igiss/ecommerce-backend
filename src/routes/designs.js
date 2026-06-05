const express = require('express');
const router = express.Router();

const designs = [];

router.get('/', (req, res) => {
  res.json(designs);
});

router.post('/', (req, res) => {
  const design = {
    id: designs.length + 1,
    productId: req.body.productId,
    name: req.body.name || 'Untitled design',
    baseColor: req.body.baseColor,
    accentColor: req.body.accentColor,
    hasImage: Boolean(req.body.hasImage),
    createdAt: new Date().toISOString()
  };

  designs.push(design);
  res.status(201).json(design);
});

module.exports = router;
