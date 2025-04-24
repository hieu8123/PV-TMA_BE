const express = require('express');
const router = express.Router();
const WebSocket = require('ws');

// In-memory data store for polls
const polls = [];
let nextPollId = 1;

// WebSocket server
let wss;

// Initialize WebSocket server
const initializeWebSocket = (server) => {
  wss = new WebSocket.Server({ server });
  
  wss.on('connection', (ws) => {
    console.log('New client connected');
    
    ws.on('close', () => {
      console.log('Client disconnected');
    });
  });
};

// Broadcast poll updates to all connected clients
const broadcastPollUpdate = (pollId) => {
  if (wss) {
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ type: 'pollUpdate', pollId }));
      }
    });
  }
};

// Check for expired polls
const checkExpiredPolls = () => {
  const now = new Date();
  polls.forEach(poll => {
    if (poll.expiresAt && new Date(poll.expiresAt) < now && !poll.isExpired) {
      poll.isExpired = true;
      broadcastPollUpdate(poll.id);
    }
  });
};

// Run expiration check every minute
setInterval(checkExpiredPolls, 60000);

// GET /polls - Fetch all polls
router.get('/', (req, res) => {
  const { showResults } = req.query;
  const pollsToReturn = polls.map(poll => {
    if (showResults === 'true' || poll.showResults) {
      return poll;
    }
    return {
      ...poll,
      options: poll.options.map(option => ({
        id: option.id,
        text: option.text
      }))
    };
  });
  res.json({ polls: pollsToReturn });
});

// POST /polls - Create a poll with title and options
router.post('/', (req, res) => {
  const { title, options, expiresAt, showResults } = req.body;
  
  // Validate request
  if (!title || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ 
      error: 'Poll must have a title and at least 2 options' 
    });
  }

  // Validate expiration date if provided
  if (expiresAt && new Date(expiresAt) <= new Date()) {
    return res.status(400).json({
      error: 'Expiration date must be in the future'
    });
  }

  // Create new poll
  const poll = {
    id: nextPollId++,
    title,
    options: options.map(option => ({
      id: Math.random().toString(36).substr(2, 9),
      text: option,
      votes: 0
    })),
    createdAt: new Date(),
    expiresAt: expiresAt ? new Date(expiresAt) : null,
    isExpired: false,
    showResults: showResults || false
  };

  // Add to polls array
  polls.push(poll);

  res.status(201).json({ 
    message: 'Poll created successfully', 
    poll 
  });
});

// POST /polls/:id/vote - Submit a vote for an option
router.post('/:id/vote', (req, res) => {
  const pollId = parseInt(req.params.id);
  const { optionId } = req.body;

  // Validate request
  if (!optionId) {
    return res.status(400).json({ error: 'Option ID is required' });
  }

  // Find poll
  const poll = polls.find(p => p.id === pollId);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  // Check if poll is expired
  if (poll.isExpired) {
    return res.status(400).json({ error: 'Poll has expired' });
  }

  // Find option
  const option = poll.options.find(o => o.id === optionId);
  if (!option) {
    return res.status(404).json({ error: 'Option not found' });
  }

  // Increment vote count
  option.votes += 1;

  // Broadcast update to all clients
  broadcastPollUpdate(pollId);

  res.json({ 
    message: 'Vote recorded successfully', 
    poll: poll.showResults ? poll : {
      ...poll,
      options: poll.options.map(opt => ({
        id: opt.id,
        text: opt.text
      }))
    }
  });
});

// GET /polls/:id - Fetch poll with vote counts
router.get('/:id', (req, res) => {
  const pollId = parseInt(req.params.id);
  const { showResults } = req.query;

  // Find poll
  const poll = polls.find(p => p.id === pollId);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  // Calculate total votes
  const totalVotes = poll.options.reduce((sum, option) => sum + option.votes, 0);

  // Return poll with or without results based on showResults flag
  const pollToReturn = showResults === 'true' || poll.showResults ? poll : {
    ...poll,
    options: poll.options.map(option => ({
      id: option.id,
      text: option.text
    }))
  };

  res.json({
    poll: pollToReturn,
    totalVotes: showResults === 'true' || poll.showResults ? totalVotes : undefined
  });
});

// PATCH /polls/:id/show-results - Toggle results visibility
router.patch('/:id/show-results', (req, res) => {
  const pollId = parseInt(req.params.id);
  const { showResults } = req.body;

  // Find poll
  const poll = polls.find(p => p.id === pollId);
  if (!poll) {
    return res.status(404).json({ error: 'Poll not found' });
  }

  // Update showResults flag
  poll.showResults = showResults;

  // Broadcast update to all clients
  broadcastPollUpdate(pollId);

  res.json({
    message: 'Results visibility updated successfully',
    poll
  });
});

// Export router and WebSocket initialization function
module.exports = router;
module.exports.initializeWebSocket = initializeWebSocket; 