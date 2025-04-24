const express = require('express');
const router = express.Router();

// GET all items
router.get('/items', (req, res) => {
  res.json({ message: 'GET all items', items: [] });
});

// GET item by ID
router.get('/items/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `GET item with ID: ${id}`, item: { id } });
});

// POST new item
router.post('/items', (req, res) => {
  const newItem = req.body;
  res.status(201).json({ message: 'Item created successfully', item: newItem });
});

// PUT (update) item
router.put('/items/:id', (req, res) => {
  const { id } = req.params;
  const updatedItem = req.body;
  res.json({ message: `Item ${id} updated successfully`, item: updatedItem });
});

// DELETE item
router.delete('/items/:id', (req, res) => {
  const { id } = req.params;
  res.json({ message: `Item ${id} deleted successfully` });
});

// Health check endpoint
router.get('/health', (req, res) => {
  res.json({ 
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Version endpoint
router.get('/version', (req, res) => {
  res.json({ 
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

module.exports = router; 