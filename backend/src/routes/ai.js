import express from 'express';
import verifyToken from '../middleware/auth.js';
import { getAIAdvice } from '../services/aiAgent.js';

const router = express.Router();

// POST /api/ai/chat — Get streaming advice (verifyToken protected)
router.post('/chat', verifyToken, async (req, res) => {
  try {
    const { regionId, message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: 'message is required' });
    }

    // Set streaming headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Call getAIAdvice and write chunks to the response object directly
    await getAIAdvice(req.user.userId, regionId, message, (textChunk) => {
      res.write(textChunk);
    });

    res.end();
  } catch (error) {
    console.error('AI chat endpoint error:', error);
    // Write SSE friendly error markers if we already started streaming headers
    if (!res.headersSent) {
      return res.status(500).json({ success: false, message: error.message });
    } else {
      res.write(`\n[ERROR: ${error.message}]`);
      res.end();
    }
  }
});

export default router;
