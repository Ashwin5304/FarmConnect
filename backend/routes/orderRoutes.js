const express = require("express");
const mongoose = require("mongoose");
const Order = require("../models/Order");
const Product = require("../models/Product");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const router = express.Router();

// One order is created per farmer so each farmer only receives their own products.
router.post("/", protect, allowRoles("customer"), async (req, res) => {
  const reserved = [];
  const createdOrders = [];
  try {
    const { items, phone, address, notes = "" } = req.body;
    if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ message: "Your cart is empty." });
    if (!phone || !/^\+?[0-9\s-]{10,15}$/.test(String(phone))) return res.status(400).json({ message: "Enter a valid contact number." });
    if (!address || String(address).trim().length < 8) return res.status(400).json({ message: "Enter a complete delivery address." });
    if (items.length > 30) return res.status(400).json( { message: "You can order up to 30 different products at once." });

    const quantities = new Map();
    for (const item of items) {
      if (!mongoose.isValidObjectId(item.productId) || !Number.isFinite(Number(item.quantity)) || Number(item.quantity) <= 0) return res.status(400).json({ message: "Invalid product or quantity in cart." });
      quantities.set(item.productId, (quantities.get(item.productId) || 0) + Number(item.quantity));
    }

    const productIds = [...quantities.keys()];
    const products = await Product.find({ _id: { $in: productIds } }).populate("farmer", "name");
    if (products.length !== productIds.length) return res.status(400).json({ message: "One or more products are no longer available. Refresh your cart." });

    const grouped = new Map();
    for (const product of products) {
      const quantity = quantities.get(product._id.toString());
      if (product.quantity < quantity) throw new Error(`${product.name} has only ${product.quantity} ${product.unit} available.`);
      if (!grouped.has(product.farmer._id.toString())) grouped.set(product.farmer._id.toString(), []);
      grouped.get(product.farmer._id.toString()).push({ product, quantity });
    }

    // Reserve stock with a conditional update to prevent ordering more than available.
    for (const product of products) {
      const quantity = quantities.get(product._id.toString());
      const updated = await Product.findOneAndUpdate(
        { _id: product._id, quantity: { $gte: quantity } },
        { $inc: { quantity: -quantity } },
        { new: true }
      );
      if (!updated) throw new Error(`${product.name} stock changed. Please refresh your cart and try again.`);
      reserved.push({ productId: product._id, quantity });
    }

    for (const [farmerId, farmerItems] of grouped.entries()) {
      const orderItems = farmerItems.map(({ product, quantity }) => ({
        product: product._id, name: product.name, price: product.price,
        quantity, unit: product.unit, lineTotal: Number((product.price * quantity).toFixed(2))
      }));
      const total = Number(orderItems.reduce((sum, item) => sum + item.lineTotal, 0).toFixed(2));
      const order = await Order.create({ customer: req.user.id, farmer: farmerId, items: orderItems, total, phone: String(phone).trim(), address: String(address).trim(), notes: String(notes).trim(), paymentMethod: "Cash on Delivery" });
      createdOrders.push(order);
    }

    res.status(201).json({ message: "Order placed successfully.", orders: createdOrders.map(o => ({ id: o._id, total: o.total, farmer: o.farmer })) });
  } catch (error) {
    // Compensate stock reservations if any later step failed.
    for (const item of reserved) await Product.updateOne({ _id: item.productId }, { $inc: { quantity: item.quantity } }).catch(() => {});
    for (const order of createdOrders) await Order.deleteOne({ _id: order._id }).catch(() => {});
    res.status(400).json({ message: error.message || "Could not place order." });
  }
});

router.get("/mine", protect, allowRoles("customer"), async (req, res) => {
  try {
    const orders = await Order.find({ customer: req.user.id }).populate("farmer", "name phone").sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) { res.status(500).json({ message: "Could not load your orders.", detail: error.message }); }
});

router.get("/farmer", protect, allowRoles("farmer"), async (req, res) => {
  try {
    const orders = await Order.find({ farmer: req.user.id }).populate("customer", "name email phone").sort({ createdAt: -1 });
    res.json(orders);
  } catch (error) { res.status(500).json({ message: "Could not load farmer orders.", detail: error.message }); }
});

async function restoreStock(order) {
  if (order.stockRestored) return;
  for (const item of order.items) await Product.updateOne({ _id: item.product }, { $inc: { quantity: item.quantity } });
  order.stockRestored = true;
}

router.patch("/:id/status", protect, allowRoles("farmer"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid order ID." });
    const { status } = req.body;
    const allowed = {
      Pending: ["Accepted", "Rejected"],
      Accepted: ["Preparing"],
      Preparing: ["Out for Delivery"],
      "Out for Delivery": ["Delivered"]
    };
    const order = await Order.findOne({ _id: req.params.id, farmer: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (!allowed[order.status]?.includes(status)) return res.status(400).json({ message: `Cannot change order from ${order.status} to ${status}.` });
    if (status === "Rejected") await restoreStock(order);
    order.status = status;
    await order.save();
    res.json({ message: `Order marked ${status}.`, order });
  } catch (error) { res.status(500).json({ message: "Could not update order.", detail: error.message }); }
});

router.patch("/:id/cancel", protect, allowRoles("customer"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid order ID." });
    const order = await Order.findOne({ _id: req.params.id, customer: req.user.id });
    if (!order) return res.status(404).json({ message: "Order not found." });
    if (order.status !== "Pending") return res.status(400).json({ message: "Only pending orders can be cancelled. Contact the farmer if the order was already accepted." });
    await restoreStock(order);
    order.status = "Cancelled";
    await order.save();
    res.json({ message: "Order cancelled successfully." });
  } catch (error) { res.status(500).json({ message: "Could not cancel order.", detail: error.message }); }
});

module.exports = router;
