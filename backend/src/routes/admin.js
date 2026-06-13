import express from 'express';
import verifyToken from '../middleware/auth.js';
import allowRoles from '../middleware/roleGuard.js';
import { jobStatus } from '../jobs/ingestCron.js';

const router = express.Router();

// GET /api/admin/jobs-status — ndma only
router.get('/jobs-status', verifyToken, allowRoles('ndma'), (req, res) => {
  try {
    return res.status(200).json({
      success: true,
      data: jobStatus,
    });
  } catch (error) {
    console.error('GET /api/admin/jobs-status error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
