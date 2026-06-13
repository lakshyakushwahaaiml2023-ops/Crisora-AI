import express from 'express';
import jwt from 'jsonwebtoken';
import Joi from 'joi';
import User from '../models/User.js';
import verifyToken from '../middleware/auth.js';

const router = express.Router();

// Joi schema for validating user registration
const registerSchema = Joi.object({
  name: Joi.string().required().messages({
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters long',
    'any.required': 'Password is required',
  }),
  role: Joi.string()
    .valid('citizen', 'collector', 'district_authority', 'state_authority', 'ndma')
    .default('citizen'),
  phone: Joi.string().allow('', null),
  location: Joi.object({
    type: Joi.string().valid('Point').default('Point'),
    coordinates: Joi.array().items(Joi.number()).length(2).required().messages({
      'any.required': 'Location coordinates [longitude, latitude] are required',
      'array.length': 'Coordinates array must contain exactly 2 numbers [longitude, latitude]',
    }),
  }).required().messages({
    'any.required': 'Location is required',
  }),
  district: Joi.string().allow('', null),
  state: Joi.string().allow('', null),
});

// Joi schema for validating user login
const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email address',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

// POST /register - Register a new user
router.post('/register', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = registerSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return res.status(400).json({ success: false, errors });
    }

    const { email } = value;

    // Check if email already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email is already registered' });
    }

    // Create and save new user
    const newUser = new User(value);
    await newUser.save();

    // Verify JWT_SECRET is loaded
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('CRITICAL ERROR: JWT_SECRET environment variable is missing.');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    // Sign JWT token
    const token = jwt.sign(
      {
        userId: newUser._id,
        role: newUser.role,
        district: newUser.district || null,
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Return token and user details (excluding password)
    const userResponse = newUser.toObject();
    delete userResponse.password;

    return res.status(201).json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during registration' });
  }
});

// POST /login - Login an existing user
router.post('/login', async (req, res) => {
  try {
    // Validate request body
    const { error, value } = loginSchema.validate(req.body, { abortEarly: false });
    if (error) {
      const errors = error.details.map((detail) => detail.message);
      return res.status(400).json({ success: false, errors });
    }

    const { email, password } = value;

    // Find user by email
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ success: false, message: 'User account is deactivated' });
    }

    // Compare passwords
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Verify JWT_SECRET is loaded
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error('CRITICAL ERROR: JWT_SECRET environment variable is missing.');
      return res.status(500).json({ success: false, message: 'Server configuration error' });
    }

    // Sign JWT token
    const token = jwt.sign(
      {
        userId: user._id,
        role: user.role,
        district: user.district || null,
      },
      jwtSecret,
      { expiresIn: '24h' }
    );

    // Return token and user details (excluding password)
    const userResponse = user.toObject();
    delete userResponse.password;

    return res.status(200).json({
      success: true,
      token,
      user: userResponse,
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

// GET /me — Protected route: returns the currently authenticated user's decoded token payload
router.get('/me', verifyToken, async (req, res) => {
  try {
    // Fetch full user document from DB to return up-to-date profile
    const user = await User.findById(req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    return res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error('GET /me error:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
});

export default router;
