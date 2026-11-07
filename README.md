# FarmConnect – Local Farmer Marketplace

A React + Vite frontend and Node.js + Express + MongoDB backend for a local farmer marketplace. Farmers publish products; customers browse, add items to a cart, place Cash on Delivery orders, and track order status. Farmers receive orders in their dashboard and update their fulfilment status.

## Features included

- Customer and farmer registration/login with bcrypt password hashing and JWT authentication.
- Role-protected farmer and customer dashboards.
- Farmer product create, read, update and delete (CRUD).
- Customer marketplace populated from MongoDB, category filtering and text search.
- Cart quantity controls and stock limits.
- Checkout with phone, delivery address and optional delivery notes.
- Cash on Delivery orders; a separate order is created for each farmer represented in a mixed-farmer cart.
- Stock is reserved when an order is placed and restored if a pending order is cancelled or a farmer rejects it.
- Farmer order inbox with Accept → Preparing → Out for Delivery → Delivered workflow, or Reject.
- Customer order history, status tracking and cancellation while order is Pending.
- Farmer dashboard refreshes orders/products every 15 seconds; customer history refreshes every 20 seconds.

## Project structure

```text
FarmConnect_Complete/
├── backend/
│   ├── config/db.js
│   ├── middleware/authMiddleware.js
│   ├── models/User.js
│   ├── models/Product.js
│   ├── models/Order.js
│   ├── routes/authRoutes.js
│   ├── routes/productRoutes.js
│   ├── routes/orderRoutes.js
│   ├── .env.example
│   ├── package.json
│   └── server.js
└── frontend/
    ├── src/App.jsx
    ├── src/App.css
    ├── src/index.css
    ├── src/main.jsx
    ├── index.html
    └── package.json
```

## Requirements

- Node.js 18 or later (Node 20 LTS recommended)
- MongoDB Community Server running locally, or a MongoDB Atlas connection string
- VS Code (recommended)

## Setup

### 1. Backend

Open a terminal:

```powershell
cd "C:\Users\YOUR_USERNAME\Documents\FSAD PBL\backend"
npm install
Copy-Item .env.example .env
```

Open `backend/.env` and set values:

```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/farmconnect
JWT_SECRET=replace_with_a_long_random_private_secret
CLIENT_ORIGIN=http://localhost:5173
```

Do not commit `.env` or share the JWT secret. Start the API:

```powershell
npm run dev
```

Expected output includes `MongoDB Connected Successfully!` and `FarmConnect API running on port 5000`.

### 2. Frontend

Open a second terminal:

```powershell
cd "C:\Users\YOUR_USERNAME\Documents\FSAD PBL\frontend"
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`.

If you are adding these files to your existing project, replace `frontend/src/App.jsx`, `frontend/src/App.css`, `frontend/src/index.css`, and `frontend/src/main.jsx`; merge the backend files into the matching folders. Keep your actual `.env` file and local MongoDB data.

## Test the full workflow

1. Register a farmer at `/register` and select **Farmer**.
2. Log in as the farmer, open **My Products**, and add a product with a name, category, description, price, stock quantity, unit and optional image URL.
3. Log out. Register a customer and log in as **Customer**.
4. Browse the homepage. Farmer listings are loaded from `GET /api/products`.
5. Add products to the cart, open Cart, and select **Proceed to Checkout**.
6. Enter a phone number and delivery address, then click **Confirm COD Order**.
7. The customer is taken to **My Orders**. A farmer order is created for each farmer in the cart.
8. Log back in as the relevant farmer. Their order appears under **Incoming Orders**. Accept it, then mark it Preparing, Out for Delivery and Delivered.
9. The customer dashboard refreshes and displays the updated status.

## API endpoints

### Authentication

- `POST /api/auth/register` – create a farmer or customer account.
- `POST /api/auth/login` – authenticate and return JWT + user profile.
- `GET /api/auth/me` – get the authenticated account.

### Products

- `GET /api/products` – public active/in-stock marketplace listings.
- `GET /api/products/my-products` – authenticated farmer's products.
- `POST /api/products` – farmer adds a product.
- `PUT /api/products/:id` – farmer edits their own product.
- `DELETE /api/products/:id` – farmer deletes their own product.

### Orders

- `POST /api/orders` – customer places COD order(s); body contains `items: [{ productId, quantity }]`, `phone`, `address`, and optional `notes`.
- `GET /api/orders/mine` – customer's order history.
- `GET /api/orders/farmer` – farmer's incoming orders.
- `PATCH /api/orders/:id/status` – farmer changes an order through the allowed status workflow.
- `PATCH /api/orders/:id/cancel` – customer cancels a Pending order.

## Notes and limitations

- Product photos are currently provided as public image URLs. This project does not include binary image uploads or cloud image storage; add Cloudinary/S3 if actual uploads are required.
- Farmer notification is in-dashboard polling (15-second refresh), not SMS, email, push notification, or real-time WebSocket delivery. The order is stored immediately and appears on the next refresh.
- Payments are Cash on Delivery only; there is no online payment gateway.
- Direct delivery is coordinated by the farmer using the delivery address and phone number supplied at checkout.
- The order API uses stock reservation with compensating rollback on an error. For production-grade concurrent ordering across multiple documents, use MongoDB transactions on a replica set and add idempotency keys.
- This is a local MCA project baseline, not a production-hardened deployment. Before public deployment, add HTTPS, stronger validation/rate limiting, secure cookie or token handling, audit logs, backups, and a production secret manager.
