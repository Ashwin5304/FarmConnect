const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 100 },
  category: { type: String, required: true, enum: ["Vegetables", "Fruits", "Grains", "Dairy", "Organic", "Others"] },
  description: { type: String, required: true, trim: true, maxlength: 1000 },
  price: { type: Number, required: true, min: 0.01 },
  quantity: { type: Number, required: true, min: 0 },
  unit: { type: String, required: true, enum: ["kg", "gram", "piece", "dozen", "litre"] },
  imageUrl: { type: String, default: "", trim: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true }
}, { timestamps: true });

module.exports = mongoose.model("Product", productSchema);
