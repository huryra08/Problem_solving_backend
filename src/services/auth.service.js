// authentication service

const bcrypt = require("bcrypt");
const User = require("../models/User");
const generateToken = require("../utils/generateToken");
const { sendWelcomeEmail } = require("./email.service");

// OLD (Bug 4): role was taken from the request and adminKey was never checked
// const register = async ({ name, email, password, role, adminKey }) => {
const register = async ({ name, email, password, adminKey }) => {
  const exists = await User.findOne({ email });
  if (exists) throw new Error("Email already registered");

  const passwordHash = await bcrypt.hash(password, 10);

  // Bug 4 fix: role is decided only by a matching admin key, never by the payload
  let role = "student";
  if (adminKey) {
    const serverKey = process.env.ADMIN_REGISTRATION_KEY;
    if (!serverKey || adminKey !== serverKey) {
      throw new Error("Invalid admin registration key");
    }
    role = "admin";
  }

  // OLD (Bug 4): user could pass role directly without adminKey verification
  // const user = await User.create({
  //   name,
  //   email,
  //   passwordHash,
  //   role: role || "student",
  // });
  const user = await User.create({
    name,
    email,
    passwordHash,
    role,
  });

  const token = generateToken({ id: user._id, role: user.role });

  // Send welcome email (non-blocking - don't wait for it)
  sendWelcomeEmail(user.email, user.name).catch((err) => {
    console.error("Email sending failed (non-critical):", err.message);
  });

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
};

const login = async ({ email, password }) => {
  const user = await User.findOne({ email });
  if (!user) throw new Error("Invalid email or password");

  // OLD (Bug 3): plaintext equality check instead of bcrypt.compare
  // const match = (password === user.passwordHash);
  // Bug 3 fix: compare against the bcrypt hash
  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new Error("Invalid email or password");

  const token = generateToken({ id: user._id, role: user.role });

  return {
    token,
    user: { id: user._id, name: user.name, email: user.email, role: user.role },
  };
};

const getMe = async (userId) => {
  const user = await User.findById(userId).select("-passwordHash");
  if (!user) throw new Error("User not found");
  return user;
};

module.exports = { register, login, getMe };