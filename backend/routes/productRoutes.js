const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const router = express.Router();
const categories = ["Vegetables", "Fruits", "Grains", "Dairy", "Organic", "Others"];
const units = ["kg", "gram", "piece", "dozen", "litre"];

function validateProduct(body) {
  const { name, category, description, price, quantity, unit, imageUrl } = body;
  if (!name || !category || !description || price === undefined || quantity === undefined || !unit) return "Name, category, description, price, quantity and unit are required.";
  if (!categories.includes(category)) return "Invalid product category.";
  if (!units.includes(unit)) return "Invalid product unit.";
  if (!Number.isFinite(Number(price)) || Number(price) <= 0) return "Price must be greater than zero.";
  if (!Number.isFinite(Number(quantity)) || Number(quantity) < 0) return "Quantity cannot be negative.";
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) return "Image URL must start with http:// or https://.";
  return null;
}

router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ quantity: { $gt: 0 } }).populate("farmer", "name address").sort({ createdAt: -1 });
    res.json(products);
  } catch (error) { res.status(500).json({ message: "Could not load products.", detail: error.message }); }
});

router.get("/my-products", protect, allowRoles("farmer"), async (req, res) => {
  try { res.json(await Product.find({ farmer: req.user.id }).sort({ createdAt: -1 })); }
  catch (error) { res.status(500).json({ message: "Could not load your products.", detail: error.message }); }
});

router.post("/", protect, allowRoles("farmer"), async (req, res) => {
  try {
    const validation = validateProduct(req.body);
    if (validation) return res.status(400).json({ message: validation });
    const { name, category, description, price, quantity, unit, imageUrl = "" } = req.body;
    const product = await Product.create({ name, category, description, price: Number(price), quantity: Number(quantity), unit, imageUrl, farmer: req.user.id });
    res.status(201).json({ message: "Product added successfully.", product });
  } catch (error) { res.status(500).json({ message: "Could not add product.", detail: error.message }); }
});

router.put("/:id", protect, allowRoles("farmer"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
    const validation = validateProduct(req.body);
    if (validation) return res.status(400).json({ message: validation });
    const { name, category, description, price, quantity, unit, imageUrl = "" } = req.body;
    const product = await Product.findOneAndUpdate(
      { _id: req.params.id, farmer: req.user.id },
      { name, category, description, price: Number(price), quantity: Number(quantity), unit, imageUrl },
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ message: "Product not found or you do not own it." });
    res.json({ message: "Product updated successfully.", product });
  } catch (error) { res.status(500).json({ message: "Could not update product.", detail: error.message }); }
});

router.delete("/:id", protect, allowRoles("farmer"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) return res.status(400).json({ message: "Invalid product ID." });
    const product = await Product.findOneAndDelete({ _id: req.params.id, farmer: req.user.id });
    if (!product) return res.status(404).json({ message: "Product not found or you do not own it." });
    res.json({ message: "Product deleted successfully." });
  } catch (error) { res.status(500).json({ message: "Could not delete product.", detail: error.message }); }
});

module.exports = router;
