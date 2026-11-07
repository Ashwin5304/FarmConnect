const mongoose = require("mongoose");

const orderItemSchema = new mongoose.Schema({
  product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true, min: 0 },
  quantity: { type: Number, required: true, min: 0.01 },
  unit: { type: String, required: true },
  lineTotal: { type: Number, required: true, min: 0 }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  customer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  farmer: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  items: { type: [orderItemSchema], required: true },
  total: { type: Number, required: true, min: 0 },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  notes: { type: String, default: "" },
  paymentMethod: { type: String, enum: ["Cash on Delivery"], default: "Cash on Delivery" },
  paymentStatus: { type: String, enum: ["Pending", "Paid"], default: "Pending" },
  status: { type: String, enum: ["Pending", "Accepted", "Preparing", "Out for Delivery", "Delivered", "Rejected", "Cancelled"], default: "Pending" },
  stockRestored: { type: Boolean, default: false }
}, { timestamps: true });

module.exports = mongoose.model("Order", orderSchema);
