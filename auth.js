// middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET;

async function auth(req, res, next) {
  const token = req.headers.authorization?.split(' ')[1];
   
  console.log('\n========== AUTH MIDDLEWARE ==========');
  console.log('[AUTH] Token received:', req.headers.authorization);
  console.log('[AUTH] JWT_SECRET value:', JWT_SECRET);


  if (!token){
    console.log('[AUTH] No token received');
   return res.status(401).json({ error: 'Unauthorized' });
  }
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    console.log(' Token decoded:', decoded);

    const user = await User.findById(decoded.id).select('-password');
    console.log(' Searching for user with ID:', decoded.id);

    if (!user) {
      console.log('[AUTH]  User not found', decoded.id);
      return res.status(401).json({ error: 'User not found' });
    }
  
    console.log(' User authenticated:', user.name);
    req.user = user;
    next();
  } catch (err) {
    console.error('[AUTH ERROR]', err.message);
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { auth };

