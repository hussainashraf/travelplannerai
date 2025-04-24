import express from 'express';
import plannerRoute from './planner-route';

const router = express.Router();

router.use('/planner', plannerRoute);

export default router;
