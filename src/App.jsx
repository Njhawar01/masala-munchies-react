import { useState, useEffect } from 'react';

/**
 * ==========================================
 * 1. CONFIGURATION
 * ==========================================
 */
const CONFIG = {
  hiddenPhone: 'OTE4MDc3NTYwMjI4',
  brandName: "Masala Munchies",
  FIREBASE_URL: 'https://masala-munchies-5cdf5-default-rtdb.asia-southeast1.firebasedatabase.app/.json'
};

/**
 * ==========================================
 * 2. MAIN APP COMPONENT
 * ==========================================
 */
export default function App() {
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Fetch Live Inventory on Load
  useEffect(() => {
    async function fetchInventory() {
      try {
        const response = await fetch(CONFIG.FIREBASE_URL);
        const data = await response.json();
        if (data) {
          const cleanData = Array.isArray(data) ? data : Object.values(data).filter(item => item !== null);
          setInventory(cleanData);
        }
      } catch (error) {
        console.error("Failed to load inventory:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchInventory();
  }, []);

  // Cart Functions
  const updateCart = (productId, variantId, delta) => {
    const product = inventory.find(p => p.id === productId);
    const variant = product.variants.find(v => v.variantId === variantId);
    
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.variantId === variantId);
      let currentQty = existingItem ? existingItem.qty : 0;
      let newQty = currentQty + delta;

      if (newQty > variant.stockLeft) newQty = variant.stockLeft;
      if (newQty < 0) newQty = 0;

      if (newQty === 0) {
        return prevCart.filter(item => item.variantId !== variantId);
      } else if (existingItem) {
        return prevCart.map(item => item.variantId === variantId ? { ...item, qty: newQty } : item);
      } else {
        return [...prevCart, { productId, variantId, qty: newQty }];
      }
    });
  };

  const removeFromCart = (variantId) => {
    setCart(prevCart => prevCart.filter(item => item.variantId !== variantId));
  };

  // Checkout Function
  const handleCheckout = async () => {
    if (!customerName.trim() || !customerAddress.trim()) {
      alert("Please provide both your Name and Delivery Address.");
      return;
    }

    setIsCheckingOut(true);
    let updatedInventory = JSON.parse(JSON.stringify(inventory)); // Deep copy
    let grandTotal = 0;
    let orderLines = [];

    cart.forEach(cartItem => {
      const productIndex = updatedInventory.findIndex(p => p.id === cartItem.productId);
      const product = updatedInventory[productIndex];
      const variantIndex = product.variants.findIndex(v => v.variantId === cartItem.variantId);
      
      product.variants[variantIndex].stockLeft -= cartItem.qty;
      
      const itemTotal = product.variants[variantIndex].price * cartItem.qty;
      grandTotal += itemTotal;
      orderLines.push(`- ${cartItem.qty}x ${product.name} (${product.variants[variantIndex].weight}) (₹${itemTotal})`);
    });

    try {
      await fetch(CONFIG.FIREBASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInventory)
      });

      const message = `*New Order - ${CONFIG.brandName}*%0A%0A*Customer:* ${customerName}%0A*Address:* ${customerAddress}%0A%0A*Items:*%0A${orderLines.join('%0A')}%0A%0A*Grand Total: ₹${grandTotal}*`;
      window.open(`https://wa.me/${atob(CONFIG.hiddenPhone)}?text=${message}`, '_blank');

      setInventory(updatedInventory);
      setCart([]);
      setCustomerName('');
      setCustomerAddress('');
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Something went wrong with the database. Please try again.");
    } finally {
      setIsCheckingOut(false);
    }
  };

  // Filter Products
  const filteredProducts = inventory.filter(product => {
    const matchesCategory = category === 'All' || product.category === category;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate Cart Totals
  const cartTotal = cart.reduce((total, item) => {
    const product = inventory.find(p => p.id === item.productId);
    const variant = product?.variants.find(v => v.variantId === item.variantId);
    return total + (variant ? variant.price * item.qty : 0);
  }, 0);

  return (
    <div className="text-gray-800 antialiased min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-[#fdfbf7] py-4 px-6 md:px-10 border-b border-orange-100 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto">
          <h1 className="text-3xl font-bold text-[#b45309] brand-font italic tracking-tight">
            Masala<span className="text-emerald-700 font-sans not-italic font-semibold text-2xl">Munchies</span>
          </h1>
        </div>
      </header>

      <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8 p-4 md:p-8">
        {/* Main Content Area */}
        <main className="flex-1 overflow-hidden">
          {/* Hero Banner */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-8 md:p-12 text-white shadow-sm mb-8 relative overflow-hidden">
            <div className="absolute -right-20 -top-20 w-96 h-96 bg-white opacity-10 rounded-full blur-2xl"></div>
            <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wider uppercase mb-4 backdrop-blur-sm">
              Pure Vegetarian • Premium Quality
            </span>
            <h2 className="text-4xl md:text-5xl font-bold brand-font leading-tight mb-4 shadow-sm">
              Crispy Khakhras &<br />Traditional Pickles
            </h2>
            <p className="text-orange-50 max-w-md text-sm md:text-base">
              Handcrafted, authentic home-style flavors brought straight to your doorstep. Preservative-free joy in every bite.
            </p>
          </div>

          {/* Search & Filter */}
          <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-sm mb-8">
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
                </svg>
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for your favorite flavors (e.g., Methi, Mango)..."
                className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:bg-white transition-colors text-sm"
              />
            </div>

            <nav className="flex gap-2 overflow-x-auto no-scrollbar">
              {['All', 'Khakhra', 'Pickles'].map(cat => (
                <button 
                  key={cat}
                  onClick={() => setCategory(cat)}
                  className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap ${
                    category === cat 
                      ? 'bg-[#ea580c] text-white shadow-sm' 
                      : 'bg-gray-50 text-gray-600 hover:bg-orange-50 border border-transparent'
                  }`}
                >
                  {cat === 'All' ? 'All Items' : cat}
                </button>
              ))}
            </nav>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-10 min-h-[500px]">
            {loading ? (
              <div className="col-span-full text-center py-10 text-gray-500 font-bold animate-pulse">
                Loading fresh menu...
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="col-span-full flex flex-col items-center justify-center text-gray-400 py-16 bg-white rounded-2xl border border-orange-100 shadow-sm">
                <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                </svg>
                <p className="text-sm font-medium text-gray-500">No items available right now.</p>
              </div>
            ) : (
              filteredProducts.map(product => (
                <ProductCard 
                  key={product.id} 
                  product={product} 
                  cart={cart} 
                  updateCart={updateCart} 
                />
              ))
            )}
          </div>
        </main>

        {/* Sidebar Cart */}
        <aside className="w-full lg:w-[400px] flex-shrink-0">
          <div className="bg-white border border-orange-100 rounded-2xl shadow-sm sticky top-24 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
            <div className="p-5 border-b border-gray-100 bg-[#fffdf8]">
              <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-[#b45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                </svg>
                Your Basket
              </h2>
            </div>

            <div className="p-5 overflow-y-auto flex-1 min-h-[150px] flex flex-col">
              {cart.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-3">
                  <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                  </svg>
                  <p className="text-sm">Your basket is empty</p>
                </div>
              ) : (
                cart.map(item => (
                  <CartItem 
                    key={item.variantId} 
                    item={item} 
                    inventory={inventory} 
                    updateCart={updateCart}
                    removeFromCart={removeFromCart} 
                  />
                ))
              )}
            </div>

            <div className="p-5 bg-gray-50 border-t border-gray-100">
              <div className="space-y-2 mb-4 text-sm">
                <div className="flex justify-between text-gray-500">
                  <span>Subtotal</span>
                  <span>₹{cartTotal}</span>
                </div>
                <div className="flex justify-between text-gray-500">
                  <span>Delivery Fee</span>
                  <span className="text-emerald-600 font-semibold">FREE</span>
                </div>
                <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-2">
                  <span className="font-bold text-gray-900 text-base">Grand Total</span>
                  <span className="font-bold text-xl text-gray-900">₹{cartTotal}</span>
                </div>
              </div>

              <div className="mb-5">
                <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Delivery Information</label>
                <input 
                  type="text" 
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Your Name"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm mb-3"
                />
                <input 
                  type="text" 
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Complete Delivery Address"
                  className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm"
                />
              </div>

              <button 
                onClick={handleCheckout}
                disabled={cart.length === 0 || isCheckingOut}
                className={`w-full py-3.5 text-white rounded-xl font-bold shadow-sm transition-all flex items-center justify-center gap-2 ${
                  cart.length === 0 || isCheckingOut ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#059669] hover:bg-[#047857]'
                }`}
              >
                {isCheckingOut ? "Processing..." : "Place Order via WhatsApp"}
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

/**
 * ==========================================
 * 3. PRODUCT CARD COMPONENT
 * ==========================================
 */
function ProductCard({ product, cart, updateCart }) {
  const [activeVariantId, setActiveVariantId] = useState(product.variants[0].variantId);
  const [isExpanded, setIsExpanded] = useState(false);

  const activeVariant = product.variants.find(v => v.variantId === activeVariantId);
  const cartItem = cart.find(item => item.variantId === activeVariantId);
  const currentCartQty = cartItem ? cartItem.qty : 0;
  
  const isOutOfStock = activeVariant.stockLeft === 0;
  const reachedLimit = currentCartQty >= activeVariant.stockLeft;
  
  const displayImage = activeVariant.image || product.image;
  const descriptionText = activeVariant.description || product.description || "";

  // Because Vite treats the 'public' folder as root, standard relative paths like "images/pickle.png" work fine!
  return (
    <div className="bg-[#fffdf8] rounded-2xl border border-orange-50 overflow-hidden hover:shadow-md transition-all flex flex-col h-full">
      <div className="h-48 bg-white flex items-center justify-center relative p-4 border-b border-orange-50">
        {displayImage ? (
          <img src={displayImage} alt={product.name} className={`w-full h-full object-contain ${isOutOfStock ? 'grayscale opacity-50' : ''}`} />
        ) : (
          <div className="text-orange-200">No Image</div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-gray-900 text-base leading-tight mb-1">{product.name}</h3>
        
        <p className={`text-xs text-gray-500 mb-2 ${isExpanded ? '' : 'line-clamp-2'}`}>{descriptionText}</p>
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-[10px] text-left text-orange-600 font-bold hover:text-orange-700 mb-4 block transition-colors">
          {isExpanded ? 'Read Less ↑' : 'Read More ↓'}
        </button>

        <div className="mt-auto">
          <div className="flex justify-between items-center mb-1 gap-2">
            <select 
              value={activeVariantId}
              onChange={(e) => setActiveVariantId(e.target.value)}
              className="bg-gray-50 border border-gray-200 text-gray-700 text-[11px] rounded-md focus:ring-orange-500 block p-1.5 w-24 cursor-pointer"
            >
              {product.variants.map(v => (
                <option key={v.variantId} value={v.variantId}>{v.weight}</option>
              ))}
            </select>
            <span className="font-black text-lg text-gray-900">₹{activeVariant.price}</span>
          </div>

          {isOutOfStock ? (
            <button disabled className="w-full mt-4 py-2.5 bg-gray-100 text-gray-400 rounded-xl text-sm font-bold cursor-not-allowed">Out of Stock</button>
          ) : currentCartQty > 0 ? (
            <div className="flex items-center justify-between mt-4 bg-white rounded-xl border border-emerald-500 p-1">
              <button onClick={() => updateCart(product.id, activeVariantId, -1)} className="w-10 h-8 flex items-center justify-center text-emerald-700 font-bold hover:bg-emerald-50 rounded-lg">-</button>
              <span className="font-bold text-emerald-800 text-sm">{currentCartQty}</span>
              <button 
                onClick={() => updateCart(product.id, activeVariantId, 1)} 
                disabled={reachedLimit} 
                className={`w-10 h-8 flex items-center justify-center font-bold rounded-lg ${reachedLimit ? 'text-gray-300 cursor-not-allowed' : 'text-emerald-700 hover:bg-emerald-50'}`}
              >
                +
              </button>
            </div>
          ) : (
            <button onClick={() => updateCart(product.id, activeVariantId, 1)} className="w-full mt-4 py-2.5 bg-[#fff8ef] hover:bg-[#ffeedb] text-[#d97706] rounded-xl text-sm font-bold transition-colors border border-orange-100">
              Add To Basket
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * ==========================================
 * 4. CART ITEM COMPONENT
 * ==========================================
 */
function CartItem({ item, inventory, updateCart, removeFromCart }) {
  const product = inventory.find(p => p.id === item.productId);
  const variant = product?.variants.find(v => v.variantId === item.variantId);
  
  if (!product || !variant) return null;

  const reachedLimit = item.qty >= variant.stockLeft;
  const itemTotal = variant.price * item.qty;

  return (
    <div className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0">
      <div className="flex-1 pr-4">
        <div className="text-sm font-bold text-gray-800 mb-1">{product.name}</div>
        <div className="text-xs text-gray-400">{variant.weight} • ₹{variant.price}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center border border-gray-200 rounded-lg bg-white">
          <button onClick={() => updateCart(product.id, variant.variantId, -1)} className="px-2 py-1 text-gray-500 hover:text-gray-800 font-bold text-sm">-</button>
          <span className="px-2 text-xs font-bold text-gray-900">{item.qty}</span>
          <button 
            onClick={() => updateCart(product.id, variant.variantId, 1)} 
            disabled={reachedLimit} 
            className={`px-2 py-1 font-bold text-sm ${reachedLimit ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-800'}`}
          >
            +
          </button>
        </div>
        <div className="text-sm font-black text-gray-900 w-12 text-right">₹{itemTotal}</div>
        
        <button onClick={() => removeFromCart(variant.variantId)} className="text-red-400 hover:text-red-600 p-1 ml-1 transition-colors" title="Remove item">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}