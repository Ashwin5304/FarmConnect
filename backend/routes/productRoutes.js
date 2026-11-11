
const express = require("express");
const mongoose = require("mongoose");
const Product = require("../models/Product");
const { protect, allowRoles } = require("../middleware/authMiddleware");
const upload = require("../middleware/upload");

const router = express.Router();

const categories = [
  "Vegetables", "Fruits", "Grains", "Dairy", "Organic", "Others"
];

const units = ["kg", "gram", "piece", "dozen", "litre"];

function validateProduct(body) {
  const {
    name, category, description, price, quantity, unit, imageUrl
  } = body;

  if (!name || !category || !description ||
      price === undefined || quantity === undefined || !unit) {
    return "Name, category, description, price, quantity and unit are required.";
  }

  if (!categories.includes(category)) return "Invalid product category.";
  if (!units.includes(unit)) return "Invalid product unit.";
  if (!Number.isFinite(Number(price)) || Number(price) <= 0)
    return "Price must be greater than zero.";
  if (!Number.isFinite(Number(quantity)) || Number(quantity) < 0)
    return "Quantity cannot be negative.";

  if (imageUrl) {
    try {
      const url = new URL(imageUrl);
      if (!["http:", "https:"].includes(url.protocol)) {
        return "Invalid image URL.";
      }
    } catch {
      return "Invalid image URL.";
    }
  }

  return null;
}

// Get all available products
router.get("/", async (req, res) => {
  try {
    const products = await Product.find({ quantity: { $gt: 0 } })
      .populate("farmer", "name address phone")
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message: "Could not load products.",
      detail: error.message
    });
  }
});

// Get products belonging to the logged-in farmer
router.get("/my-products", protect, allowRoles("farmer"), async (req, res) => {
  try {
    const products = await Product.find({ farmer: req.user.id })
      .sort({ createdAt: -1 });

    res.json(products);
  } catch (error) {
    res.status(500).json({
      message: "Could not load your products.",
      detail: error.message
    });
  }
});

// Add product with multiple images
router.post(
  "/",
  protect,
  allowRoles("farmer"),
  upload.array("images", 5),
  async (req, res) => {
    try {
      const validation = validateProduct(req.body);
      if (validation) return res.status(400).json({ message: validation });

      const {
        name, category, description, price, quantity, unit,
        imageUrl = ""
      } = req.body;

      const images = (req.files || []).map(
        file => `/uploads/${file.filename}`
      );

      const product = await Product.create({
        name,
        category,
        description,
        price: Number(price),
        quantity: Number(quantity),
        unit,
        imageUrl,
        images,
        farmer: req.user.id
      });

      res.status(201).json({
        message: "Product added successfully.",
        product
      });
    } catch (error) {
      res.status(500).json({
        message: "Could not add product.",
        detail: error.message
      });
    }
  }
);

// Update product and optionally replace its images
router.put(
  "/:id",
  protect,
  allowRoles("farmer"),
  upload.array("images", 5),
  async (req, res) => {
    try {
      if (!mongoose.isValidObjectId(req.params.id)) {
        return res.status(400).json({ message: "Invalid product ID." });
      }

      const validation = validateProduct(req.body);
      if (validation) return res.status(400).json({ message: validation });

      const {
        name, category, description, price, quantity, unit,
        imageUrl = ""
      } = req.body;

      const updateData = {
        name,
        category,
        description,
        price: Number(price),
        quantity: Number(quantity),
        unit,
        imageUrl
      };

      if (req.files && req.files.length > 0) {
        updateData.images = req.files.map(
          file => `/uploads/${file.filename}`
        );
      }

      const product = await Product.findOneAndUpdate(
        { _id: req.params.id, farmer: req.user.id },
        updateData,
        { new: true, runValidators: true }
      );

      if (!product) {
        return res.status(404).json({
          message: "Product not found or you do not own it."
        });
      }

      res.json({
        message: "Product updated successfully.",
        product
      });
    } catch (error) {
      res.status(500).json({
        message: "Could not update product.",
        detail: error.message
      });
    }
  }
);

// Delete product
router.delete("/:id", protect, allowRoles("farmer"), async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: "Invalid product ID." });
    }

    const product = await Product.findOneAndDelete({
      _id: req.params.id,
      farmer: req.user.id
    });

    if (!product) {
      return res.status(404).json({
        message: "Product not found or you do not own it."
      });
    }

    res.json({ message: "Product deleted successfully." });
  } catch (error) {
    res.status(500).json({
      message: "Could not delete product.",
      detail: error.message
    });
  }
});

module.exports = router;
