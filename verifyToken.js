const admin = require('./firebase');

const verifyToken = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).send({ message: 'Unauthorized - No token provided' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = await admin.auth().verifyIdToken(token);

    // ✅ Add these logs for debugging
    console.log("🔐 Token received:", token.slice(0, 20) + "...");
    console.log("👤 Decoded user:", decoded);

    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error);
    res.status(403).send({ message: 'Forbidden - Invalid token' });
  }
};

module.exports = verifyToken;
