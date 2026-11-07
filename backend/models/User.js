const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, select: false },
  phone: { type: String, required: true, trim: true },
  address: { type: String, required: true, trim: true },
  role: { type: String, enum: ["farmer", "customer", "admin"], default: "customer" }
}, { timestamps: true });

module.exports = mongoose.model("User", userSchema);
