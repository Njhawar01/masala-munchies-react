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
  const [view, setView] = useState('shop'); // 'shop' or 'admin'
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [loading, setLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

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
        const filtered = prevCart.filter(item => item.variantId !== variantId);
        if (filtered.length === 0) setIsMobileCartOpen(false);
        return filtered;
      } else if (existingItem) {
        return prevCart.map(item => item.variantId === variantId ? { ...item, qty: newQty } : item);
      } else {
        return [...prevCart, { productId, variantId, qty: newQty }];
      }
    });
  };

  const removeFromCart = (variantId) => {
    setCart(prevCart => {
      const filtered = prevCart.filter(item => item.variantId !== variantId);
      if (filtered.length === 0) setIsMobileCartOpen(false);
      return filtered;
    });
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
      setIsMobileCartOpen(false);
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

  const totalCartItemsCount = cart.reduce((total, item) => total + item.qty, 0);

  return (
    <div className="text-gray-800 antialiased min-h-screen flex flex-col relative pb-20 lg:pb-0">
      
      {/* Header Panel */}
      <header className="bg-[#fdfbf7] py-4 px-6 md:px-10 border-b border-orange-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 onClick={() => setView('shop')} className="text-3xl font-bold text-[#b45309] brand-font italic tracking-tight cursor-pointer">
            Masala<span className="text-emerald-700 font-sans not-italic font-semibold text-2xl">Munchies</span>
          </h1>
          
          <button 
            onClick={() => setView(view === 'shop' ? 'admin' : 'shop')}
            className="flex items-center gap-2 px-4 py-2 border border-gray-200 hover:border-orange-200 rounded-xl text-xs font-bold transition-colors bg-white shadow-xs cursor-pointer"
          >
            {view === 'shop' ? (
              <>
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path>
                </svg>
                Admin Panel
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                </svg>
                Back To Store
              </>
            )}
          </button>
        </div>
      </header>

      {/* RENDER ADMIN VIEW */}
      {view === 'admin' ? (
        <AdminDashboard inventory={inventory} setInventory={setInventory} />
      ) : (
        /* RENDER SHOP VIEW */
        <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8 p-4 md:p-8">
          
          <main className="flex-1 overflow-hidden">
            {/* Hero Banner */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-2xl p-8 md:p-12 text-white shadow-xs mb-8 relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-96 h-96 bg-white opacity-10 rounded-full blur-2xl"></div>
              <span className="inline-block px-3 py-1 bg-white/20 rounded-full text-xs font-bold tracking-wider uppercase mb-4 backdrop-blur-xs">
                Pure Vegetarian • Premium Quality
              </span>
              <h2 className="text-4xl md:text-5xl font-bold brand-font leading-tight mb-4 shadow-xs">
                Crispy Khakhras &<br />Traditional Pickles
              </h2>
              <p className="text-orange-50 max-w-md text-sm md:text-base">
                Handcrafted, authentic home-style flavors brought straight to your doorstep. Preservative-free joy in every bite.
              </p>
            </div>

            {/* Search & Filter */}
            <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-xs mb-8">
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
                    className={`px-5 py-2 rounded-xl text-sm font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                      category === cat 
                        ? 'bg-[#ea580c] text-white shadow-xs' 
                        : 'bg-gray-50 text-gray-600 hover:bg-orange-50 border border-transparent'
                    }`}
                  >
                    {cat === 'All' ? 'All Items' : cat}
                  </button>
                ))}
              </nav>
            </div>

            {/* Product Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pb-10 min-h-[500px]">
              {loading ? (
                <div className="col-span-full text-center py-10 text-gray-500 font-bold animate-pulse">
                  Loading fresh menu...
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center text-gray-400 py-16 bg-white rounded-2xl border border-orange-100 shadow-xs">
                  <svg className="w-12 h-12 text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                  </svg>
                  <p className="text-sm font-medium text-gray-500">No items found matching your search.</p>
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

          {/* Desktop Sidebar Sidebar Basket (Hidden on mobile viewports) */}
          <aside className="hidden lg:block lg:w-[400px] flex-shrink-0">
            <div className="bg-white border border-orange-100 rounded-2xl shadow-xs sticky top-24 overflow-hidden flex flex-col max-h-[calc(100vh-8rem)]">
              <div className="p-5 border-b border-gray-100 bg-[#fffdf8]">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <svg className="w-5 h-5 text-[#b45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                  </svg>
                  Your Basket
                </h2>
              </div>
              <CartContent 
                cart={cart} inventory={inventory} cartTotal={cartTotal} updateCart={updateCart} removeFromCart={removeFromCart}
                customerName={customerName} setCustomerName={setCustomerName} customerAddress={customerAddress} setCustomerAddress={setCustomerAddress}
                handleCheckout={handleCheckout} isCheckingOut={isCheckingOut}
              />
            </div>
          </aside>

          {/* Intuitive Mobile Floating Action Button (FAB) Bar */}
          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 p-4 flex items-center justify-between z-40 lg:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase">Total Basket ({totalCartItemsCount} items)</div>
                <div className="text-xl font-black text-gray-900">₹{cartTotal}</div>
              </div>
              <button 
                onClick={() => setIsMobileCartOpen(true)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-xs flex items-center gap-2 transition-transform active:scale-95 text-sm cursor-pointer"
              >
                View Basket
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path>
                </svg>
              </button>
            </div>
          )}

          {/* Slide-Up Mobile Cart Modal Drawer Overlay */}
          {isMobileCartOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end lg:hidden transition-opacity">
              <div className="bg-white rounded-t-2xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-slide-up">
                <div className="p-4 border-b border-gray-100 bg-[#fffdf8] flex justify-between items-center">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                    <svg className="w-5 h-5 text-[#b45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
                    </svg>
                    Your Basket ({totalCartItemsCount})
                  </h2>
                  <button 
                    onClick={() => setIsMobileCartOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                    </svg>
                  </button>
                </div>
                <div className="overflow-y-auto flex-1">
                  <CartContent 
                    cart={cart} inventory={inventory} cartTotal={cartTotal} updateCart={updateCart} removeFromCart={removeFromCart}
                    customerName={customerName} setCustomerName={setCustomerName} customerAddress={customerAddress} setCustomerAddress={setCustomerAddress}
                    handleCheckout={handleCheckout} isCheckingOut={isCheckingOut}
                  />
                </div>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}

/**
 * ==========================================
 * 3. COMPONENT: CART CONTENT INTERNAL
 * ==========================================
 */
function CartContent({ cart, inventory, cartTotal, updateCart, removeFromCart, customerName, setCustomerName, customerAddress, setCustomerAddress, handleCheckout, isCheckingOut }) {
  return (
    <>
      <div className="p-5 overflow-y-auto flex-1 min-h-[150px] max-h-[40vh] lg:max-h-none flex flex-col">
        {cart.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center text-gray-400 space-y-3 py-8">
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

      <div className="p-5 bg-gray-50 border-t border-gray-100 mt-auto">
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
          className={`w-full py-3.5 text-white rounded-xl font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
            cart.length === 0 || isCheckingOut ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#059669] hover:bg-[#047857] cursor-pointer'
          }`}
        >
          {isCheckingOut ? "Processing..." : "Place Order via WhatsApp"}
        </button>
      </div>
    </>
  );
}

/**
 * ==========================================
 * 4. COMPONENT: PRODUCT CARD 
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

  return (
    <div className="bg-[#fffdf8] rounded-2xl border border-orange-50 overflow-hidden hover:shadow-md transition-all flex flex-col h-full relative">
      <div className="h-48 bg-white flex items-center justify-center relative p-4 border-b border-orange-50">
        {displayImage ? (
          <img src={displayImage} alt={product.name} className={`w-full h-full object-contain ${isOutOfStock ? 'grayscale opacity-50' : ''}`} />
        ) : (
          <div className="text-orange-200 text-xs">No Image Available</div>
        )}
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-base leading-tight">{product.name}</h3>
          
          {/* FEATURE 3: Low stock warning indicator badge */}
          {!isOutOfStock && activeVariant.stockLeft <= 5 && (
            <span className="text-[9px] font-extrabold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md tracking-wide animate-pulse shrink-0">
              ONLY {activeVariant.stockLeft} LEFT
            </span>
          )}
        </div>
        
        <p className={`text-xs text-gray-500 mb-2 ${isExpanded ? '' : 'line-clamp-2'}`}>{descriptionText}</p>
        <button onClick={() => setIsExpanded(!isExpanded)} className="text-[10px] text-left text-orange-600 font-bold hover:text-orange-700 mb-4 block transition-colors cursor-pointer">
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
              <button onClick={() => updateCart(product.id, activeVariantId, -1)} className="w-10 h-8 flex items-center justify-center text-emerald-700 font-bold hover:bg-emerald-50 rounded-lg cursor-pointer">-</button>
              <span className="font-bold text-emerald-800 text-sm">{currentCartQty}</span>
              <button 
                onClick={() => updateCart(product.id, activeVariantId, 1)} 
                disabled={reachedLimit} 
                className={`w-10 h-8 flex items-center justify-center font-bold rounded-lg ${reachedLimit ? 'text-gray-300 cursor-not-allowed' : 'text-emerald-700 hover:bg-emerald-50 cursor-pointer'}`}
              >
                +
              </button>
            </div>
          ) : (
            <button onClick={() => updateCart(product.id, activeVariantId, 1)} className="w-full mt-4 py-2.5 bg-[#fff8ef] hover:bg-[#ffeedb] text-[#d97706] rounded-xl text-sm font-bold transition-colors border border-orange-100 cursor-pointer">
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
 * 5. COMPONENT: CART ITEM MODAL/SIDEBAR CELL
 * ==========================================
 */
function CartItem({ item, inventory, updateCart, removeFromCart }) {
  const product = inventory.find(p => p.id === item.productId);
  const variant = product?.variants.find(v => v.variantId === item.variantId);
  
  if (!product || !variant) return null;

  const reachedLimit = item.qty >= variant.stockLeft;
  const itemTotal = variant.price * item.qty;

  return (
    <div className="flex justify-between items-center py-4 border-b border-gray-100 last:border-0 bg-white">
      <div className="flex-1 pr-4">
        <div className="text-sm font-bold text-gray-800 mb-1">{product.name}</div>
        <div className="text-xs text-gray-400">{variant.weight} • ₹{variant.price}</div>
      </div>
      <div className="flex items-center gap-3">
        <div className="flex items-center border border-gray-200 rounded-lg bg-white">
          <button onClick={() => updateCart(product.id, variant.variantId, -1)} className="px-2 py-1 text-gray-500 hover:text-gray-800 font-bold text-sm cursor-pointer">-</button>
          <span className="px-2 text-xs font-bold text-gray-900">{item.qty}</span>
          <button 
            onClick={() => updateCart(product.id, variant.variantId, 1)} 
            disabled={reachedLimit} 
            className={`px-2 py-1 font-bold text-sm ${reachedLimit ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-800 cursor-pointer'}`}
          >
            +
          </button>
        </div>
        <div className="text-sm font-black text-gray-900 w-12 text-right">₹{itemTotal}</div>
        
        <button onClick={() => removeFromCart(variant.variantId)} className="text-red-400 hover:text-red-600 p-1 ml-1 transition-colors cursor-pointer" title="Remove item">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
          </svg>
        </button>
      </div>
    </div>
  );
}

/**
 * ==========================================
 * 6. COMPONENT: ADMIN DASHBOARD
 * ==========================================
 */
function AdminDashboard({ inventory, setInventory }) {
  const [localInventory, setLocalInventory] = useState([]);
  const [isSaving, setIsSaving] = useState(false);

  // Sync internal state with props when data flows in
  useEffect(() => {
    if (inventory.length > 0) {
      setLocalInventory(JSON.parse(JSON.stringify(inventory)));
    }
  }, [inventory]);

  const handleStockChange = (productId, variantId, value) => {
    const intValue = parseInt(value, 10) || 0;
    setLocalInventory(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          variants: p.variants.map(v => v.variantId === variantId ? { ...v, stockLeft: intValue } : v)
        };
      }
      return p;
    }));
  };

  const handlePriceChange = (productId, variantId, value) => {
    const intValue = parseInt(value, 10) || 0;
    setLocalInventory(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          variants: p.variants.map(v => v.variantId === variantId ? { ...v, price: intValue } : v)
        };
      }
      return p;
    }));
  };

  const handleSaveToFirebase = async () => {
    setIsSaving(true);
    try {
      const response = await fetch(CONFIG.FIREBASE_URL, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localInventory)
      });
      if (!response.ok) throw new Error("Sync failed");
      
      setInventory(localInventory);
      alert("Inventory synced successfully to Realtime Database!");
    } catch (error) {
      console.error(error);
      alert("Failed to save changes. Check internet or Firebase configs.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full p-4 md:p-8 flex-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Inventory Management</h2>
          <p className="text-xs text-gray-500">Update stock levels and menu pricing directly to the cloud.</p>
        </div>
        <button
          onClick={handleSaveToFirebase}
          disabled={isSaving}
          className={`px-6 py-3 text-white font-bold text-sm rounded-xl shadow-xs transition-colors ${
            isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'
          }`}
        >
          {isSaving ? "Syncing..." : "Publish Changes to Firebase"}
        </button>
      </div>

      <div className="space-y-6">
        {localInventory.map(product => (
          <div key={product.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-xs">
            <div className="flex items-center gap-3 border-b border-gray-50 pb-3 mb-4">
              <span className="text-xs font-bold uppercase tracking-wider bg-orange-50 border border-orange-100 text-orange-700 px-2.5 py-1 rounded-md">
                {product.category}
              </span>
              <h3 className="font-bold text-gray-900 text-base">{product.name}</h3>
              <span className="text-[10px] text-gray-400 font-mono ml-auto">ID: #{product.id}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {product.variants.map(variant => (
                <div key={variant.variantId} className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-3 bg-gray-50 border border-gray-100 rounded-lg gap-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-gray-800">{variant.weight} variant</span>
                    <span className="text-[10px] text-gray-400 font-mono">{variant.variantId}</span>
                  </div>

                  <div className="flex items-center gap-4 w-full sm:w-auto justify-end">
                    {/* Price Input Form */}
                    <div className="w-24 shrink-0">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Price (₹)</label>
                      <input 
                        type="number"
                        value={variant.price}
                        onChange={(e) => handlePriceChange(product.id, variant.variantId, e.target.value)}
                        className="w-full bg-white border border-gray-200 px-2 py-1.5 rounded-lg text-sm font-semibold text-gray-900 focus:outline-emerald-600 cursor-text"
                      />
                    </div>

                    {/* Stock Input Form */}
                    <div className="w-24 shrink-0">
                      <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Stock Left</label>
                      <input 
                        type="number"
                        value={variant.stockLeft}
                        onChange={(e) => handleStockChange(product.id, variant.variantId, e.target.value)}
                        className={`w-full bg-white border px-2 py-1.5 rounded-lg text-sm font-bold focus:outline-emerald-600 cursor-text ${
                          variant.stockLeft === 0 ? 'text-red-600 border-red-200 bg-red-50/30' : 'text-gray-800 border-gray-200'
                        }`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}