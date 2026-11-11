import React, { useCallback, useEffect, useMemo, useState } from "react";

import {
  Sprout,
  ShoppingCart,
  Search,
  UserRound,
    Phone,
  Leaf,
  Truck,
  ShieldCheck,
  ArrowRight,
  MapPin,
  X,
  Plus,
  Minus,
  Trash2,
  Package,
  ClipboardList,
  LogOut,
  Pencil,
  CheckCircle,
  Clock,
  Menu,
  RefreshCw
} from "lucide-react";

import {
  Routes,
  Route,
  Link,
  useNavigate,
  Navigate
} from "react-router-dom";

import "./App.css";

const API = "http://localhost:5000/api";
const API_BASE = API.replace(/\/api$/, "");

function getImageUrl(src) {
  if (!src) return "";
  return src.startsWith("http") ? src : `${API_BASE}${src}`;
}
const CATEGORIES = [
  { name: "Vegetables", icon: "🥦" }, { name: "Fruits", icon: "🍎" },
  { name: "Grains", icon: "🌾" }, { name: "Dairy", icon: "🥛" },
  { name: "Organic", icon: "🥬" }, { name: "Others", icon: "🧺" }
];
const UNITS = ["kg", "gram", "piece", "dozen", "litre"];
const STATUSES = ["Pending", "Accepted", "Preparing", "Out for Delivery", "Delivered", "Rejected", "Cancelled"];

function readUser() {
  try { return JSON.parse(localStorage.getItem("user") || "null"); }
  catch { return null; }
}
function authHeaders(json = false) {
  const headers = { Authorization: `Bearer ${localStorage.getItem("token") || ""}` };
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}
async function apiRequest(path, options = {}) {
  const response = await fetch(`${API}${path}`, options);
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.message || "Something went wrong. Please try again.");
  return data;
}
function money(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 }).format(Number(value || 0));
}
function ProductImage({ product, className = "" }) {
  const images = [
    ...(Array.isArray(product.images) ? product.images : []),
    ...(product.imageUrl ? [product.imageUrl] : [])
  ].filter(Boolean);
  const [activeIndex, setActiveIndex] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setActiveIndex(0);
    setFailed(false);
  }, [product._id]);

  if (!images.length || failed) {
    return <div className={`${className} marketplace-image-placeholder`}><Leaf size={34} /></div>;
  }

  const activeImage = images[Math.min(activeIndex, images.length - 1)];

  return (
    <div className="product-gallery">
      <img
        className={className}
        src={getImageUrl(activeImage)}
        alt={product.name}
        onError={() => setFailed(true)}
      />
      {images.length > 1 && (
        <div className="product-gallery-thumbnails">
          {images.map((image, index) => (
            <button
              type="button"
              key={`${image}-${index}`}
              className={activeIndex === index ? "active" : ""}
              onClick={() => { setActiveIndex(index); setFailed(false); }}
              aria-label={`View product image ${index + 1}`}
            >
              <img src={getImageUrl(image)} alt="" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
function ProtectedRoute({ role, children }) {
  const user = readUser();
  const token = localStorage.getItem("token");
  if (!token || !user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to={user.role === "farmer" ? "/farmer-dashboard" : "/customer-dashboard"} replace />;
  return children;
}

// ---------------- HOME / CUSTOMER MARKETPLACE ----------------
function Home() {
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [cart, setCart] = useState(() => {
    try { return JSON.parse(localStorage.getItem("farmconnect_cart") || "[]"); } catch { return []; }
  });
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const user = readUser();
  const navigate = useNavigate();

  const loadProducts = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const data = await apiRequest("/products");
      setProducts(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { localStorage.setItem("farmconnect_cart", JSON.stringify(cart)); }, [cart]);

  const filteredProducts = useMemo(() => products.filter(p =>
    (category === "All" || p.category === category) &&
    `${p.name} ${p.description || ""} ${p.category} ${p.farmer?.name || ""}`.toLowerCase().includes(search.toLowerCase()) &&
    Number(p.quantity) > 0
  ), [products, category, search]);
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  function addToCart(product) {
    if (!user) { navigate("/login"); return; }
    if (user.role !== "customer") { setNotice("Please use a customer account to place an order."); return; }
    setCart(previous => {
      const found = previous.find(item => item.productId === product._id);
      if (found) return previous.map(item => item.productId === product._id ? { ...item, quantity: Math.min(item.quantity + 1, product.quantity) } : item);
      return [...previous, { productId: product._id, name: product.name, price: product.price, unit: product.unit, quantity: 1, stock: product.quantity, imageUrl: product.images?.[0] || product.imageUrl || "", farmerName: product.farmer?.name || "Local Farmer" }];
    });
    setNotice(`${product.name} added to cart.`);
  }
  function changeCart(id, delta) {
    setCart(previous => previous.map(item => item.productId === id ? { ...item, quantity: Math.max(1, Math.min(item.quantity + delta, item.stock)) } : item));
  }
  function removeCart(id) { setCart(previous => previous.filter(item => item.productId !== id)); }
  function logout() { localStorage.removeItem("token"); localStorage.removeItem("user"); setCart([]); localStorage.removeItem("farmconnect_cart"); navigate("/"); }

  return <div className="app">
    <nav className="navbar">
      <Link to="/" className="brand"><Sprout size={30} /><span>Farm<span className="brand-highlight">Connect</span></span></Link>
      <div className="nav-links"><a href="#home">Home</a><a href="#categories">Categories</a><a href="#products">Products</a><a href="#about">About Us</a></div>
      <div className="nav-actions">
        <button className="cart-button" onClick={() => setCartOpen(true)}><ShoppingCart size={20} /> Cart <span className="cart-count">{cartCount}</span></button>
        {user ? <><span className="nav-user">Hi, {user.name}</span><Link className="login-button" to={user.role === "farmer" ? "/farmer-dashboard" : "/customer-dashboard"}>Dashboard</Link><button className="signup-button" onClick={logout}>Logout</button></> : <><Link to="/login" className="login-button"><UserRound size={17}/> Login</Link><Link to="/register" className="signup-button">Sign Up</Link></>}
      </div>
    </nav>

    <section className="hero" id="home"><div className="hero-content">
      <div className="hero-label"><Leaf size={17}/> FRESH FROM LOCAL FARMS</div>
      <h1>From Our Farms<br/><span>To Your Table.</span></h1>
      <p>Discover fresh vegetables, fruits and farm products directly from local farmers. Support our farmers and enjoy nature's goodness every day.</p>
      <div className="hero-buttons"><a href="#products" className="primary-button">Explore Products <ArrowRight size={18}/></a><a href="#about" className="secondary-button">Learn More</a></div>
      <div className="hero-stats"><div><h3>100%</h3><span>Fresh Produce</span></div><div><h3>Direct</h3><span>From Farmers</span></div><div><h3>Local</h3><span>Farm Support</span></div></div>
    </div></section>

    <section className="categories section" id="categories"><div className="section-heading"><div><span className="section-label">EXPLORE OUR STORE</span><h2>Shop By Category</h2><p>Find fresh products from your local farmers.</p></div><a href="#products" className="view-link">View Products <ArrowRight size={17}/></a></div>
      <div className="category-grid"><button className={`category-card ${category === "All" ? "selected" : ""}`} onClick={() => setCategory("All")}><span className="category-icon">🧺</span><h3>All Products</h3><span className="category-small">Explore everything</span></button>{CATEGORIES.map(c => <button className={`category-card ${category === c.name ? "selected" : ""}`} key={c.name} onClick={() => setCategory(c.name)}><span className="category-icon">{c.icon}</span><h3>{c.name}</h3><span className="category-small">Explore products</span></button>)}</div>
    </section>

    <section className="products-section section" id="products"><div className="section-heading"><div><span className="section-label">FRESHLY HARVESTED</span><h2>Products From Local Farmers</h2><p>Real listings published by FarmConnect farmers.</p></div><button className="refresh-products" onClick={loadProducts}><RefreshCw size={15}/> Refresh</button></div>
      <div className="search-box"><Search size={20}/><input placeholder="Search products, categories or farmers..." value={search} onChange={e => setSearch(e.target.value)}/></div>
      <div className="active-filter-row"><span>Showing {filteredProducts.length} product(s) {category !== "All" ? `in ${category}` : ""}</span>{category !== "All" && <button onClick={() => setCategory("All")}>Clear category</button>}</div>
      {notice && <p className="product-message">{notice}</p>}
      {loading ? <div className="product-status">Loading fresh products...</div> : error ? <div className="product-status product-error">{error} <button onClick={loadProducts}>Try again</button></div> : filteredProducts.length === 0 ? <div className="marketplace-empty"><Leaf size={42}/><h3>No products found</h3><p>Try another search or category. New farmer listings will appear here.</p><button onClick={() => {setSearch("");setCategory("All");}}>Show all products</button></div> :
        <div className="product-grid">{filteredProducts.map(product => <article className="product-card" key={product._id}>
          <div className="product-image"><ProductImage product={product}/><span className="fresh-tag">Fresh</span></div>
          <div className="product-info"><div className="rating"><Leaf size={14}/> {product.category}</div><h3>{product.name}</h3><p className="farmer-name">
              <Sprout size={15}/>
              {product.farmer?.name || "Local Farmer"}
            </p>
            {product.farmer?.phone && (
              <a
                href={`tel:${product.farmer.phone}`}
                className="contact-farmer-button"
              >
                <Phone size={16} />
                Contact Farmer
              </a>
            )}<p className="market-product-description">{product.description}</p><p className="product-stock">Available: {product.quantity} {product.unit}</p>
            <div className="product-bottom"><div className="price">{money(product.price)}<span> / {product.unit}</span></div><button className="add-button" disabled={!user || user.role !== "customer"} onClick={() => addToCart(product)}>{!user ? "Login to buy" : user.role !== "customer" ? "Customer only" : "+ Add"}</button></div>
          </div></article>)}</div>}
    </section>

    <section className="why-section section" id="about"><div className="section-heading center-heading"><span className="section-label">WHY FARMCONNECT?</span><h2>Better For You, Better For Farmers</h2><p>We bring farmers and customers closer together.</p></div><div className="benefits-grid"><div className="benefit-card"><Sprout size={35}/><h3>Direct From Farmers</h3><p>Buy agricultural products directly from local farmers.</p></div><div className="benefit-card"><ShieldCheck size={35}/><h3>Fresh & Quality</h3><p>Discover fresh farm produce with transparent pricing.</p></div><div className="benefit-card"><Truck size={35}/><h3>Direct Delivery</h3><p>Get your orders delivered by the farmers themselves.</p></div></div></section>
    <footer className="footer"><Link to="/" className="brand footer-brand"><Sprout size={27}/><span>Farm<span className="brand-highlight">Connect</span></span></Link><p>Connecting local farmers with customers, one harvest at a time.</p><div className="footer-location"><MapPin size={16}/> Supporting Local Farmers</div><p className="copyright">© 2026 FarmConnect. All Rights Reserved.</p></footer>

    {cartOpen && <div className="cart-overlay" onMouseDown={e => { if (e.target === e.currentTarget) setCartOpen(false); }}><aside className="cart-panel"><div className="cart-panel-header"><div><h2>Your Cart</h2><p>{cartCount} item(s)</p></div><button className="cart-close" onClick={() => setCartOpen(false)} aria-label="Close cart"><X/></button></div>
      {cart.length === 0 ? <div className="cart-empty"><ShoppingCart size={45}/><h3>Your cart is empty</h3><p>Add fresh products from local farmers.</p><button onClick={() => setCartOpen(false)}>Continue shopping</button></div> : <><div className="cart-items">{cart.map(item => <div className="cart-item" key={item.productId}>{item.imageUrl ? <img src={getImageUrl(item.imageUrl)} alt={item.name}/> : <div className="cart-item-placeholder"><Leaf/></div>}<div className="cart-item-info"><strong>{item.name}</strong><span>{money(item.price)} / {item.unit}</span><div className="cart-item-controls"><button onClick={() => changeCart(item.productId, -1)} disabled={item.quantity <= 1}><Minus size={13}/></button><span>{item.quantity}</span><button onClick={() => changeCart(item.productId, 1)} disabled={item.quantity >= item.stock}><Plus size={13}/></button><button className="cart-remove" onClick={() => removeCart(item.productId)}>Remove</button></div></div></div>)}</div><div className="cart-footer"><div className="cart-total"><span>Subtotal</span><strong>{money(subtotal)}</strong></div><p className="cart-note">Cash on Delivery · Delivery directly by the farmer</p><button className="checkout-button" onClick={() => { if (!user || user.role !== "customer") { setCartOpen(false); navigate("/login"); return; } setCartOpen(false); setCheckoutOpen(true); }}>Proceed to Checkout</button></div></>}
    </aside></div>}
    {checkoutOpen && <CheckoutModal cart={cart} setCart={setCart} onClose={() => setCheckoutOpen(false)} onPlaced={orders => { setCheckoutOpen(false); setNotice(`Order placed successfully! ${orders.length} farmer order(s) created.`); navigate("/customer-dashboard"); }} />}
  </div>;
}

function CheckoutModal({ cart, setCart, onClose, onPlaced }) {
  const user = readUser();
  const [form, setForm] = useState({ phone: user?.phone || "", address: user?.address || "", notes: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const total = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  async function submit(e) {
    e.preventDefault(); setLoading(true); setError("");
    try {
      const data = await apiRequest("/orders", { method: "POST", headers: authHeaders(true), body: JSON.stringify({ items: cart.map(i => ({ productId: i.productId, quantity: i.quantity })), phone: form.phone, address: form.address, notes: form.notes }) });
      setCart([]); onPlaced(data.orders || [data.order]);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  return <div className="modal-backdrop"><form className="checkout-modal" onSubmit={submit}><div className="modal-heading"><div><span className="section-label">FINAL STEP</span><h2>Delivery & Checkout</h2></div><button type="button" className="cart-close" onClick={onClose}><X/></button></div><p className="checkout-intro">Confirm where the farmer should deliver your order.</p><label>Customer name</label><input value={user?.name || ""} readOnly/><label>Phone number</label><input type="tel" required minLength="10" value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="Enter contact number"/><label>Delivery address</label><textarea required minLength="8" value={form.address} onChange={e => setForm({...form, address:e.target.value})} placeholder="House number, street, area, city, PIN code"/><label>Delivery notes (optional)</label><textarea value={form.notes} onChange={e => setForm({...form, notes:e.target.value})} placeholder="Landmark or delivery instructions"/><div className="checkout-summary"><span>Cash on Delivery total</span><strong>{money(total)}</strong></div>{error && <p className="form-error">{error}</p>}<button className="checkout-button" disabled={loading}>{loading ? "Placing order..." : "Confirm COD Order"}</button><p className="checkout-terms">By confirming, your order details will be shared with the relevant farmer(s).</p></form></div>;
}

// ---------------- LOGIN / REGISTER ----------------
function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState(""); const [password, setPassword] = useState(""); const [message, setMessage] = useState(""); const [loading, setLoading] = useState(false);
  async function handleLogin(e) { e.preventDefault(); setLoading(true); setMessage(""); try { const data = await apiRequest("/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({email,password}) }); localStorage.setItem("token",data.token); localStorage.setItem("user",JSON.stringify(data.user)); navigate(data.user.role === "farmer" ? "/farmer-dashboard" : "/customer-dashboard"); } catch(err) { setMessage(err.message); } finally { setLoading(false); } }
  return <div className="auth-page"><div className="auth-card"><Link to="/" className="auth-logo"><Sprout size={35}/><h2>FarmConnect</h2></Link><h1>Welcome Back!</h1><p>Login to continue to FarmConnect.</p><form onSubmit={handleLogin}><label>Email Address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Enter your email" required/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Enter your password" required/><button disabled={loading}>{loading ? "Logging in..." : "Login"}</button></form>{message && <p className="auth-message">{message}</p>}<p className="auth-switch">Don't have an account? <Link to="/register">Sign Up</Link></p><Link to="/" className="back-home">Back to Home</Link></div></div>;
}
function Register() {
  const navigate = useNavigate();
  const [form,setForm] = useState({name:"",email:"",password:"",phone:"",address:"",role:"customer"}); const [message,setMessage] = useState(""); const [loading,setLoading] = useState(false);
  function change(e){setForm({...form,[e.target.name]:e.target.value});}
  async function submit(e){e.preventDefault();setLoading(true);setMessage("");try{await apiRequest("/auth/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(form)});setMessage("Account created successfully. Redirecting to login...");setTimeout(()=>navigate("/login"),900);}catch(err){setMessage(err.message);}finally{setLoading(false);}}
  return <div className="auth-page"><div className="auth-card"><Link to="/" className="auth-logo"><Sprout size={35}/><h2>FarmConnect</h2></Link><h1>Create Account</h1><p>Join FarmConnect today.</p><form onSubmit={submit}><label>Full Name</label><input name="name" value={form.name} onChange={change} required/><label>Email Address</label><input type="email" name="email" value={form.email} onChange={change} required/><label>Password</label><input type="password" name="password" minLength="6" value={form.password} onChange={change} required/><label>Phone Number</label><input type="tel" name="phone" minLength="10" value={form.phone} onChange={change} required/><label>Address</label><textarea name="address" value={form.address} onChange={change} required/><label>Register As</label><select name="role" value={form.role} onChange={change}><option value="customer">Customer</option><option value="farmer">Farmer</option></select><button disabled={loading}>{loading ? "Creating account..." : "Create Account"}</button></form>{message && <p className="auth-message">{message}</p>}<p className="auth-switch">Already have an account? <Link to="/login">Login</Link></p><Link to="/" className="back-home">Back to Home</Link></div></div>;
}

// ---------------- SHARED DASHBOARD HELPERS ----------------
function DashboardHeader({ title, subtitle, user, onLogout }) {
  return <header className="dashboard-header"><div><p className="dashboard-subtitle">{subtitle}</p><h1>{title}</h1></div><div className="farmer-profile"><div className="profile-avatar">{user?.name?.charAt(0)?.toUpperCase() || "U"}</div><div><strong>{user?.name}</strong><span>{user?.role === "farmer" ? "Farmer Account" : "Customer Account"}</span></div><button className="dashboard-logout-top" onClick={onLogout}><LogOut size={16}/> Logout</button></div></header>;
}
function StatusPill({ status }) { return <span className={`status-pill status-${String(status || "pending").toLowerCase().replaceAll(" ","-")}`}>{status}</span>; }

// ---------------- FARMER DASHBOARD ----------------
function FarmerDashboard() {
  const navigate = useNavigate(); const user = readUser(); const token = localStorage.getItem("token");
  const [products,setProducts] = useState([]); const [orders,setOrders] = useState([]); const [showForm,setShowForm] = useState(false); const [editing,setEditing] = useState(null); const [loading,setLoading] = useState(false); const [message,setMessage] = useState(""); const [error,setError] = useState("");
  const empty = {name:"",category:"Vegetables",description:"",price:"",quantity:"",unit:"kg",imageUrl:""}; const [form,setForm] = useState(empty);
  const [selectedImages, setSelectedImages] = useState([]);
  const [imagePreviews, setImagePreviews] = useState([]);
  const logout=()=>{localStorage.removeItem("token");localStorage.removeItem("user");navigate("/login");};
  const load=useCallback(async()=>{try{const [p,o]=await Promise.all([apiRequest("/products/my-products",{headers:authHeaders()}),apiRequest("/orders/farmer",{headers:authHeaders()})]);setProducts(p);setOrders(o);setError("");}catch(e){setError(e.message);}},[]);
  useEffect(()=>{load();const timer=setInterval(load,15000);return()=>clearInterval(timer);},[load]);
  function clearSelectedImages() {
    imagePreviews.forEach(url => URL.revokeObjectURL(url));
    setSelectedImages([]);
    setImagePreviews([]);
  }
  function openAdd(){
    clearSelectedImages();
    setEditing(null);
    setForm(empty);
    setShowForm(true);
    setMessage("");
  }
  function openEdit(p){
    clearSelectedImages();
    setEditing(p._id);
    setForm({name:p.name,category:p.category,description:p.description,price:String(p.price),quantity:String(p.quantity),unit:p.unit,imageUrl:p.imageUrl||""});
    setShowForm(true);
    setMessage("");
  }
  function handleImageSelection(e) {
    const files = Array.from(e.target.files || []);
    if (files.length > 5) {
      setError("You can upload a maximum of 5 images.");
      e.target.value = "";
      return;
    }
    const invalid = files.find(file => !file.type.startsWith("image/"));
    if (invalid) {
      setError("Please select image files only.");
      e.target.value = "";
      return;
    }
    if (files.some(file => file.size > 5 * 1024 * 1024)) {
      setError("Each image must be 5 MB or smaller.");
      e.target.value = "";
      return;
    }
    clearSelectedImages();
    setSelectedImages(files);
    setImagePreviews(files.map(file => URL.createObjectURL(file)));
    setError("");
  }
  async function saveProduct(e){
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    try {
      const url = editing ? `/products/${editing}` : "/products";
      const body = new FormData();
      Object.entries(form).forEach(([key, value]) => body.append(key, value));
      selectedImages.forEach(file => body.append("images", file));

      const data = await apiRequest(url, {
        method: editing ? "PUT" : "POST",
        headers: { Authorization: `Bearer ${localStorage.getItem("token") || ""}` },
        body
      });

      setMessage(data.message || "Product saved successfully.");
      setShowForm(false);
      clearSelectedImages();
      setForm(empty);
      await load();
    } catch(e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }
  async function deleteProduct(id){if(!window.confirm("Delete this product?"))return;try{const data=await apiRequest(`/products/${id}`,{method:"DELETE",headers:authHeaders()});setMessage(data.message);await load();}catch(e){setError(e.message);}}
  async function updateOrder(orderId,status){try{const data=await apiRequest(`/orders/${orderId}/status`,{method:"PATCH",headers:authHeaders(true),body:JSON.stringify({status})});setMessage(data.message);await load();}catch(e){setError(e.message);}}
  const pending=orders.filter(o=>o.status==="Pending").length; const delivered=orders.filter(o=>o.status==="Delivered"); const earnings=delivered.reduce((s,o)=>s+o.total,0);
  return <div className="farmer-dashboard"><aside className="farmer-sidebar"><Link to="/" className="dashboard-brand"><Sprout size={30}/><span>FarmConnect</span></Link><p className="sidebar-label">FARMER MENU</p><a href="#overview" className="sidebar-link active"><Package size={19}/> Dashboard</a><a href="#products" className="sidebar-link"><Leaf size={19}/> My Products</a><a href="#orders" className="sidebar-link"><ClipboardList size={19}/> Orders {pending>0&&<b className="sidebar-count">{pending}</b>}</a><button className="sidebar-logout" onClick={logout}><LogOut size={19}/> Logout</button></aside>
    <main className="farmer-main"><DashboardHeader title="Dashboard Overview" subtitle="FARMER PANEL" user={user} onLogout={logout}/><section className="farmer-welcome" id="overview"><div><h2>Welcome back, {user?.name || "Farmer"}! 🌱</h2><p>Manage your products and customer orders in one place.</p></div><Sprout size={65}/></section>
      {error&&<p className="form-error">{error}</p>}{message&&<p className="product-message">{message}</p>}
      <section className="dashboard-stats"><div className="stat-card"><div className="stat-icon green-icon"><Leaf/></div><p>Total Products</p><h2>{products.length}</h2><span>Currently listed</span></div><div className="stat-card"><div className="stat-icon orange-icon"><ShoppingCart/></div><p>Total Orders</p><h2>{orders.length}</h2><span>Orders received</span></div><div className="stat-card"><div className="stat-icon blue-icon"><Clock/></div><p>Pending Orders</p><h2>{pending}</h2><span>Need your attention</span></div><div className="stat-card"><div className="stat-icon purple-icon">₹</div><p>Delivered Sales</p><h2>{money(earnings)}</h2><span>COD orders marked delivered</span></div></section>
      <section className="dashboard-section" id="products"><div className="dashboard-section-heading"><div><h2>My Products</h2><p>Add, update or remove products from your store.</p></div><button className="add-product-button" onClick={openAdd}><Plus size={16}/> Add Product</button></div>
        {showForm&&<form className="product-form" onSubmit={saveProduct}><h3>{editing?"Edit Product":"Add New Product"}</h3><div className="form-grid"><div><label>Product Name</label><input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required maxLength="100" placeholder="Fresh Tomatoes"/></div><div><label>Category</label><select value={form.category} onChange={e=>setForm({...form,category:e.target.value})}>{CATEGORIES.map(c=><option key={c.name}>{c.name}</option>)}</select></div><div><label>Price (₹ per unit)</label><input type="number" min="0.01" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required/></div><div><label>Available quantity</label><input type="number" min="0" step="0.01" value={form.quantity} onChange={e=>setForm({...form,quantity:e.target.value})} required/></div><div><label>Unit</label><select value={form.unit} onChange={e=>setForm({...form,unit:e.target.value})}>{UNITS.map(u=><option key={u}>{u}</option>)}</select></div><div className="form-full">
          <label>Product Images (up to 5, 5 MB each)</label>
          <input type="file" accept="image/*" multiple onChange={handleImageSelection}/>
          <small>Select multiple photos from your computer. Selecting new photos while editing replaces the current uploaded gallery.</small>
          {imagePreviews.length > 0 && (
            <div className="image-preview-grid">
              {imagePreviews.map((src, index) => (
                <div className="image-preview-item" key={src}>
                  <img src={src} alt={`Selected product ${index + 1}`}/>
                  <span>Image {index + 1}</span>
                </div>
              ))}
            </div>
          )}
          {editing && imagePreviews.length === 0 && (
            <small>Leave this empty to keep the existing product images.</small>
          )}
          <label className="optional-image-url-label">Or use one image URL (optional)</label>
          <input type="url" value={form.imageUrl} onChange={e=>setForm({...form,imageUrl:e.target.value})} placeholder="https://..."/>
        </div><div className="form-full"><label>Description</label><textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} required maxLength="1000" placeholder="Describe quality, harvest date, etc."/></div></div><div className="product-form-actions"><button disabled={loading}>{loading?"Saving...":editing?"Update Product":"Save Product"}</button><button type="button" className="cancel-product-button" onClick={()=>setShowForm(false)}>Cancel</button></div></form>}
        {products.length===0?<div className="dashboard-empty"><Leaf size={42}/><h3>No products added yet</h3><p>Click Add Product to list your first farm product.</p></div>:<div className="farmer-product-grid">{products.map(p=><article className="farmer-product-card" key={p._id}><ProductImage product={p}/><div className="farmer-product-details"><span>{p.category}</span><h3>{p.name}</h3><p>{money(p.price)} / {p.unit}</p><p>Stock: {p.quantity} {p.unit}</p><div className="card-actions"><button onClick={()=>openEdit(p)}><Pencil size={14}/> Edit</button><button className="delete-product-button" onClick={()=>deleteProduct(p._id)}><Trash2 size={14}/> Delete</button></div></div></article>)}</div>}</section>
      <section className="dashboard-section" id="orders"><div className="dashboard-section-heading"><div><h2>Incoming Orders</h2><p>Orders refresh automatically every 15 seconds.</p></div><button className="refresh-products" onClick={load}><RefreshCw size={15}/> Refresh</button></div>{orders.length===0?<div className="dashboard-empty"><ShoppingCart size={42}/><h3>No orders received yet</h3><p>New customer orders will appear here.</p></div>:<div className="orders-list">{orders.map(order=><article className="order-card" key={order._id}><div className="order-card-top"><div><strong>Order #{order._id.slice(-7).toUpperCase()}</strong><span>{new Date(order.createdAt).toLocaleString()}</span></div><StatusPill status={order.status}/></div><div className="order-customer"><strong>{order.customer?.name || "Customer"}</strong><span>{order.phone}</span><p>{order.address}</p></div><div className="order-lines">{order.items.map((item,i)=><div key={`${item.product}-${i}`}><span>{item.name} × {item.quantity} {item.unit}</span><strong>{money(item.lineTotal)}</strong></div>)}</div><div className="order-card-bottom"><strong>Total: {money(order.total)} · Cash on Delivery</strong><div className="order-actions">{order.status==="Pending"&&<><button onClick={()=>updateOrder(order._id,"Accepted")}>Accept</button><button className="reject-button" onClick={()=>updateOrder(order._id,"Rejected")}>Reject</button></>}{order.status==="Accepted"&&<button onClick={()=>updateOrder(order._id,"Preparing")}>Mark Preparing</button>}{order.status==="Preparing"&&<button onClick={()=>updateOrder(order._id,"Out for Delivery")}>Out for Delivery</button>}{order.status==="Out for Delivery"&&<button onClick={()=>updateOrder(order._id,"Delivered")}>Mark Delivered</button>}</div></div></article>)}</div>}</section>
    </main></div>;
}

// ---------------- CUSTOMER DASHBOARD / ORDER HISTORY ----------------
function CustomerDashboard(){
  const navigate=useNavigate();const user=readUser();const [orders,setOrders]=useState([]);const [error,setError]=useState("");const [loading,setLoading]=useState(true);
  const logout=()=>{localStorage.removeItem("token");localStorage.removeItem("user");navigate("/login");};
  const load=useCallback(async()=>{try{const data=await apiRequest("/orders/mine",{headers:authHeaders()});setOrders(data);setError("");}catch(e){setError(e.message);}finally{setLoading(false);}},[]);
  useEffect(()=>{load();const timer=setInterval(load,20000);return()=>clearInterval(timer);},[load]);
  return <div className="customer-dashboard"><header className="customer-dashboard-header"><Link to="/" className="brand"><Sprout size={28}/>Farm<span className="brand-highlight">Connect</span></Link><div className="customer-header-actions"><span>Welcome, {user?.name}</span><button className="customer-logout" onClick={logout}>Logout</button></div></header><main className="customer-dashboard-content"><p className="dashboard-subtitle">CUSTOMER ACCOUNT</p><h1>My Orders</h1><p>Track your purchases and delivery updates from local farmers.</p><Link to="/" className="customer-shop-button">Continue Shopping <ArrowRight size={16}/></Link>{error&&<p className="form-error">{error}</p>}<div className="dashboard-section"><div className="dashboard-section-heading"><div><h2>Order History</h2><p>Updates refresh automatically every 20 seconds.</p></div><button className="refresh-products" onClick={load}><RefreshCw size={15}/> Refresh</button></div>{loading?<p>Loading your orders...</p>:orders.length===0?<div className="dashboard-empty"><Package size={42}/><h3>No orders yet</h3><p>Products you order will appear here.</p></div>:<div className="orders-list">{orders.map(order=><article className="order-card" key={order._id}><div className="order-card-top"><div><strong>Order #{order._id.slice(-7).toUpperCase()}</strong><span>{new Date(order.createdAt).toLocaleString()}</span></div><StatusPill status={order.status}/></div><p className="order-farmer">Farmer: {order.farmer?.name || "FarmConnect Farmer"}</p><div className="order-lines">{order.items.map((item,i)=><div key={`${item.product}-${i}`}><span>{item.name} × {item.quantity} {item.unit}</span><strong>{money(item.lineTotal)}</strong></div>)}</div><div className="order-card-bottom"><strong>{money(order.total)} · Cash on Delivery</strong>{order.status==="Pending"&&<button className="reject-button" onClick={async()=>{if(!window.confirm("Cancel this order?"))return;try{await apiRequest(`/orders/${order._id}/cancel`,{method:"PATCH",headers:authHeaders(true),body:JSON.stringify({})});load();}catch(e){setError(e.message);}}}>Cancel Order</button>}</div><p className="delivery-address">Delivery to: {order.address}</p></article>)}</div>}</div></main></div>;
}

export default function App(){return <Routes><Route path="/" element={<Home/>}/><Route path="/login" element={<Login/>}/><Route path="/register" element={<Register/>}/><Route path="/farmer-dashboard" element={<ProtectedRoute role="farmer"><FarmerDashboard/></ProtectedRoute>}/><Route path="/customer-dashboard" element={<ProtectedRoute role="customer"><CustomerDashboard/></ProtectedRoute>}/><Route path="*" element={<Navigate to="/" replace/>}/></Routes>;}
