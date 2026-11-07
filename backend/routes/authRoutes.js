const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { protect } = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/register", async (req, res) => {
  try {
    const { name, email, password, phone, address, role } = req.body;
    if (!name || !email || !password || !phone || !address) return res.status(400).json({ message: "Please fill in all required fields." });
    if (String(password).length < 6) return res.status(400).json({ message: "Password must contain at least 6 characters." });
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ message: "Enter a valid email address." });
    if (!/^\+?[0-9\s-]{10,15}$/.test(String(phone))) return res.status(400).json({ message: "Enter a valid phone number." });
    if (!['farmer', 'customer'].includes(role || 'customer')) return res.status(400).json({ message: "Choose Farmer or Customer as your account type." });
    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) return res.status(409).json({ message: "An account with this email already exists." });
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: normalizedEmail, password: hashed, phone, address, role: role || 'customer' });
    res.status(201).json({ message: "Registration successful.", user: { id: user._id, name: user.name, email: user.email, phone: user.phone, address: user.address, role: user.role } });
  } catch (error) { res.status(500).json({ message: "Registration failed.", detail: error.message }); }
});

router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: "Email and password are required." });
    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user || !(await bcrypt.compare(password, user.password))) return res.status(401).json({ message: "Invalid email or password." });
    const token = jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET, { expiresIn: "1d" });
    res.json({ message: "Login successful.", token, user: { id: user._id, name: user.name, email: user.email, phone: user.phone, address: user.address, role: user.role } });
  } catch (error) { res.status(500).json({ message: "Login failed.", detail: error.message }); }
});

router.get("/me", protect, async (req, res) => {
  const user = await User.findById(req.user.id).select("name email phone address role");
  if (!user) return res.status(404).json({ message: "Account not found." });
  res.json(user);
});

module.exports = router;
