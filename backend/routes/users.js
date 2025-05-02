// routes/users.js

import express from 'express';
import {
  createUser,
  loginUser,
  getCurrentUser,
  updateCurrentUser,
  getUserCount,
  getAllUsers,
  updateUserById,
  deleteUserById
} from '../controllers/usersController.js';
import { refreshToken, logoutUser } from '../controllers/refreshTokenController.js';
import verifyToken, { authorizeAdmin } from '../middleware/authenticateToken.js';

const router = express.Router();

router.post('/', createUser);
router.post('/login', loginUser);
router.get('/me', verifyToken, getCurrentUser);

router.get('/count', getUserCount);

router.put('/me', verifyToken, updateCurrentUser);

router.get('/', verifyToken, authorizeAdmin, getAllUsers);    // GET /users => list all
router.patch('/:id', verifyToken, authorizeAdmin, updateUserById); // PATCH /users/:id => update one user
router.delete('/:id', verifyToken, authorizeAdmin, deleteUserById); // DELETE /users/:id => delete

router.post('/refresh-token', refreshToken);
router.post('/logout', logoutUser);


export default router;
