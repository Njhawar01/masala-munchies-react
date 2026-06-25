import { useState, useEffect } from 'react';
import { CONFIG } from './config';
import ProductCard from './components/shop/ProductCard';
import CartContent from './components/shop/CartContent';
import AdminDashboard from './components/admin/AdminDashboard';

import { generateInvoicePDF } from './utils/pdfGenerator';

export default function App() {
  const [view, setView] = useState('shop'); 
  const [inventory, setInventory] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [category, setCategory] = useState('All');
  const [isLoading, setIsLoading] = useState(true); 
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isMobileCartOpen, setIsMobileCartOpen] = useState(false);

  const [customerName, setCustomerName] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');

  // Explicit state for pacing checkout status changes
  const [checkoutStatus, setCheckoutStatus] = useState('');
  // Fallback redirection link state for popup blocker bypass
  const [whatsappUrl, setWhatsappUrl] = useState('');

  useEffect(() => {
    document.body.style.overflow = isMobileCartOpen ? 'hidden' : 'unset';
    return () => { document.body.style.overflow = 'unset'; };
  }, [isMobileCartOpen]);

  useEffect(() => {
    async function fetchInventory() {
      try {
        const response = await fetch(`${CONFIG.FIREBASE_URL}/inventory.json`);
        const data = await response.json();
        if (data) {
          const cleanData = Array.isArray(data) ? data : Object.values(data).filter(item => item !== null);
          setInventory(cleanData);
        }
      } catch (error) {
        console.error("Failed to load inventory:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchInventory();
  }, []);

  // Automated SEO meta text catalog observer
  useEffect(() => {
    const brand = CONFIG.brandName || "Joyable";
    if (category === 'All') {
      document.title = `${brand} | Authentic Home-Style Savory Snacks & Khakhras`;
    } else {
      document.title = `Buy Premium ${category} Online | ${brand}`;
    }
    
    const metaDescription = document.querySelector('meta[name="description"]');
    if (metaDescription) {
      metaDescription.setAttribute(
        'content', 
        category === 'All' 
          ? `Order fresh, preservative-free home-style savory snacks and crisp khakhras online from ${brand}. Delivered fresh to your doorstep.`
          : `Explore our premium collection of crispy, delicious homemade ${category} from ${brand}. 100% Vegetarian with zero added preservatives.`
      );
    }
  }, [category]);

  if (isLoading && inventory.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-orange-200 border-t-orange-600 rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-bold text-gray-500 animate-pulse tracking-wide">Loading fresh snacks...</p>
      </div>
    );
  }

  const updateCart = (productId, variantId, delta) => {
    const product = inventory.find(p => p.id === productId);
    const variant = product.variants?.find(v => v.variantId === variantId);
    if (!variant) return;
    
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

  const clearCart = () => {
    setCart([]);
    setIsMobileCartOpen(false);
  };

  const cartTotal = cart.reduce((total, item) => {
    const product = inventory.find(p => p.id === item.productId);
    const variant = product?.variants?.find(v => v.variantId === item.variantId);
    return total + (variant ? variant.price * item.qty : 0);
  }, 0);

  const handleCheckout = async () => {
    if (!customerName.trim() || !customerAddress.trim()) {
      alert("Please provide both your Name and Delivery Address.");
      return;
    }

    setIsCheckingOut(true);
    let updatedInventory = JSON.parse(JSON.stringify(inventory)); 
    let orderLines = [];
    let orderItemsForDb = []; 
    let totalMrp = 0;

    cart.forEach(cartItem => {
      const productIndex = updatedInventory.findIndex(p => p.id === cartItem.productId);
      if (productIndex === -1) return;
      
      const product = updatedInventory[productIndex];
      const variantIndex = product.variants?.findIndex(v => v.variantId === cartItem.variantId);
      if (variantIndex === -1 || variantIndex === undefined) return;
      
      const variant = product.variants[variantIndex];
      variant.stockLeft -= cartItem.qty;
      
      const itemTotal = variant.price * cartItem.qty;
      const itemMrpTotal = (variant.mrp || variant.price) * cartItem.qty;
      totalMrp += itemMrpTotal;
      
      const lineMrpText = variant.mrp && variant.mrp > variant.price 
        ? ` (₹${itemTotal} | MRP: ₹${itemMrpTotal})` 
        : ` (₹${itemTotal})`;
      
      orderLines.push(`- ${cartItem.qty}x ${product.name} (${variant.weight})${lineMrpText}`);
      
      orderItemsForDb.push({
        name: product.name,
        weight: variant.weight,
        qty: cartItem.qty,
        price: variant.price,
        mrp: variant.mrp || variant.price,
        total: itemTotal
      });
    });

    const discount = 0;
    const totalBeforeDelivery = cartTotal - discount;
    const deliveryFee = cartTotal < 200 ? 50 : 0; 
    const grandTotal = totalBeforeDelivery + deliveryFee;

    try {
      // Milestone 0: Dynamically fetch saved buyer records to match customer details for the PDF
      let matchingBuyer = null;
      try {
        const buyersRes = await fetch(`${CONFIG.FIREBASE_URL}/buyers.json`);
        if (buyersRes.ok) {
          const buyersData = await buyersRes.json();
          if (buyersData) {
            const buyersList = Array.isArray(buyersData) ? buyersData : Object.values(buyersData).filter(Boolean);
            matchingBuyer = buyersList.find(b => b.name && b.name.trim().toLowerCase() === customerName.trim().toLowerCase());
          }
        }
      } catch (buyerErr) {
        console.error("Could not fetch buyer details for matching:", buyerErr);
      }

      // Milestone 1: Record Order inside Firebase Database Environment
      const counterResponse = await fetch(`${CONFIG.FIREBASE_URL}/counters.json`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lastBillNo: { ".sv": { "increment": 1 } } })
      });
      const counterData = await counterResponse.json();
      const rawCounter = counterData?.lastBillNo || 1;

      const baseValue = 1000; 
      const billNo = `MM-${baseValue + rawCounter}`; 

      await fetch(`${CONFIG.FIREBASE_URL}/inventory.json`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedInventory)
      });

      const today = new Date().toLocaleDateString('en-IN');

      await fetch(`${CONFIG.FIREBASE_URL}/orders.json`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          billNo, customerName, customerAddress, totalMrp, subtotal: cartTotal, deliveryFee,
          timestamp: new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
          items: orderItemsForDb, discountApplied: Math.round(discount),
          grandTotal: Math.round(grandTotal), paymentStatus: 'pending'
        })
      });

      // Milestone 2: Update status message and generate PDF
      setCheckoutStatus("📄 Generating and downloading your retail bill... ");
      
      try {
        generateInvoicePDF({
          billNo,
          customerName,
          customerAddress: matchingBuyer?.address || customerAddress, // Prioritize saved DB address on match
          totalMrp,
          subtotal: cartTotal,
          discount: Math.round(discount),
          deliveryFee,
          grandTotal,
          date: today,
          items: orderItemsForDb,
          buyerDetails: matchingBuyer // Safely pass down the matched profile
        });
      } catch (pdfError) {
        console.error("Critical error while generating transactional local PDF:", pdfError);
      }

      // Explicit delay of 2.5 seconds to read file system retrieval status
      await new Promise(resolve => setTimeout(resolve, 2500));

      // Milestone 3: Inform customer about the upcoming browser tab change
      setCheckoutStatus("🚀 Bill downloaded! Redirecting you to WhatsApp to finalize your order...");

      const mrpSavings = totalMrp - cartTotal;
      const mrpSavingsText = mrpSavings > 0 ? `%0A*MRP Discount:* -₹${mrpSavings}` : '';
      const discountMessageText = '';
      const deliveryFeeMessageText = `%0A*Delivery Fee:* ${deliveryFee > 0 ? `₹${deliveryFee}` : 'FREE'}`;
      
      const message = `*New Order - ${CONFIG.brandName}*%0A%0A*Customer:* ${customerName}%0A*Address:* ${customerAddress}%0A%0A*Items:*%0A${orderLines.join('%0A')}%0A%0A*Total MRP:* ₹${totalMrp}${mrpSavingsText}%0A*Subtotal (Sale Price):* ₹${cartTotal}${discountMessageText}${deliveryFeeMessageText}%0A%0A*Grand Total: ₹${Math.round(grandTotal)}*${mrpSavings + discount > 0 ? `%0A%0A*Total Savings:* ₹${Math.round(mrpSavings + discount)} 🎉` : ''}`;
      
      const whatsappMessage = `whatsapp://send?phone=${atob(CONFIG.hiddenPhone)}&text=${message}`;
      const webWhatsApp = `https://web.whatsapp.com/send?phone=${atob(CONFIG.hiddenPhone)}&text=${message}`;

      // Detect if user is on mobile or desktop to separate window logic routing
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const targetUrl = isMobile ? whatsappMessage : webWhatsApp;

      // Stage redirection path into fallback state memory immediately before text delays
      setWhatsappUrl(targetUrl);

      // Explicit delay of 2 seconds to read destination message cleanly
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Global component memory reset operations
      setInventory(updatedInventory);
      setCart([]);
      setIsMobileCartOpen(false);
      setCustomerName('');
      setCustomerAddress('');
      setCheckoutStatus('');
      setWhatsappUrl('');

      // DEVICE SPECIFIC HANDLING BLOCK
      if (isMobile) {
        // Mobile uses native deep links, keeping current tab context perfectly safe
        window.location.href = whatsappMessage;
      } else {
        // Desktop forces a clean new tab container layout, saving store tab from navigating away
        window.open(webWhatsApp, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Something went wrong. Please try again.");
      setCheckoutStatus('');
      setWhatsappUrl('');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const dynamicCategories = ['All', ...new Set(inventory.map(p => p.category).filter(Boolean))];
  const filteredProducts = inventory.filter(product => {
    const matchesCategory = category === 'All' || product.category === category;
    const matchesSearch = (product.name || '').toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  })
  .sort((a, b) => {
    const aVariants = a.variants || [];
    const bVariants = b.variants || [];
    const aAllOut = aVariants.length > 0 && aVariants.every(v => Number(v.stockLeft || 0) <= 0) ? 1 : 0;
    const bAllOut = bVariants.length > 0 && bVariants.every(v => Number(v.stockLeft || 0) <= 0) ? 1 : 0;
    return aAllOut - bAllOut;
  });
  
  const totalCartItemsCount = cart.reduce((total, item) => total + item.qty, 0);

  return (
    <div className="text-gray-800 antialiased min-h-screen flex flex-col relative pb-20 lg:pb-0">
      <header className="bg-[#fdfbf7] py-4 px-4 md:px-10 border-b border-orange-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 onClick={() => setView('shop')} className="text-2xl md:text-3xl font-bold text-[#b45309] brand-font italic tracking-tight cursor-pointer">
            Masala<span className="text-emerald-700 font-sans not-italic font-semibold md:text-2xl">Munchies</span>
          </h1>
          
          <button 
            onClick={() => setView(view === 'shop' ? 'admin' : 'shop')}
            className="flex items-center gap-2 px-3 py-2 border border-gray-200 hover:border-orange-200 rounded-xl text-xs font-bold transition-colors bg-white shadow-xs cursor-pointer whitespace-nowrap"
          >
            {view === 'shop' ? (
              <>
                <svg className="w-4 h-4 text-gray-500 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path></svg>
                <span>Admin Panel</span>
              </>
            ) : (
              <>
                <svg className="w-4 h-4 text-emerald-600 hidden sm:block" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>
                <span>Store</span>
              </>
            )}
          </button>
        </div>
      </header>

      {view === 'admin' ? (
        <AdminDashboard inventory={inventory} setInventory={setInventory} />
      ) : (
        <div className="flex-1 max-w-7xl mx-auto w-full flex flex-col lg:flex-row gap-8 p-4 md:p-8">
          <main className="flex-1 overflow-hidden">
            
            <div className="bg-gradient-to-br from-orange-600 via-orange-500 to-amber-600 rounded-3xl p-8 md:p-14 text-white shadow-xs mb-4 relative overflow-hidden border border-white/10">
              <div className="absolute -right-20 -top-20 w-96 h-96 bg-white/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -left-20 -bottom-20 w-96 h-96 bg-amber-400/20 rounded-full blur-3xl pointer-events-none"></div>
              
              <div className="relative z-10 max-w-2xl">
                <span className="inline-block px-3 py-1 bg-white/20 border border-white/10 rounded-full text-[11px] font-bold tracking-widest uppercase mb-4 backdrop-blur-xs text-orange-50">
                  Premium Quality Assured
                </span>
                <h2 className="text-4xl md:text-5.5xl font-black brand-font leading-tight mb-4 tracking-tight drop-shadow-xs">
                  Authentic Home-Style Goodness.
                </h2>
                <p className="text-orange-50/90 max-w-xl text-sm md:text-base font-normal leading-relaxed">
                  Pure, preservative-free snacks made the traditional way. Experience the crunch of perfection in every bite.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-8">
              <div className="flex items-center gap-3 bg-white border border-orange-100/60 p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(234,88,12,0.02)] hover:border-orange-200 transition-all duration-200 group">
                <div className="w-8 h-8 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 tracking-wide">100% Vegetarian</h4>
                  <p className="text-[11px] text-gray-400 font-medium">Pure veggie ingredients</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 bg-white border border-orange-100/60 p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(234,88,12,0.02)] hover:border-orange-200 transition-all duration-200 group">
                <div className="w-8 h-8 rounded-xl bg-orange-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 tracking-wide">No Added Preservatives</h4>
                  <p className="text-[11px] text-gray-400 font-medium">Zero chemical additives</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-white border border-orange-100/60 p-3.5 rounded-2xl shadow-[0_2px_8px_rgba(234,88,12,0.02)] hover:border-orange-200 transition-all duration-200 group">
                <div className="w-8 h-8 rounded-xl bg-amber-50 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
                  <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
                </div>
                <div>
                  <h4 className="text-xs font-bold text-gray-900 tracking-wide">Freshly Made</h4>
                  <p className="text-[11px] text-gray-400 font-medium">Prepared in daily batches</p>
                </div>
              </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-orange-100 shadow-xs mb-8">
              <div className="relative mb-4">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
                </div>
                <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Craving something specific? Search here..." className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 text-sm" />
              </div>
              <nav className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
                {dynamicCategories.map(cat => (
                  <button key={cat} onClick={() => setCategory(cat)} className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 transform hover:scale-105 active:scale-95 whitespace-nowrap cursor-pointer ${category === cat ? 'bg-[#ea580c] text-white shadow-xs' : 'bg-gray-50 text-gray-600 hover:bg-orange-50 border border-transparent'}`}>{cat}</button>
                ))}
              </nav>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6 pb-10 min-h-[500px]">
              {isLoading ? ( 
                <div className="col-span-full text-center py-10 text-gray-500 font-bold animate-pulse">Loading fresh menu...</div>
              ) : filteredProducts.length === 0 ? (
                <div className="col-span-full flex flex-col items-center justify-center text-gray-400 py-16 bg-white rounded-2xl border border-orange-100 shadow-xs"><p className="text-sm font-medium text-gray-500">No items found.</p></div>
              ) : (
                filteredProducts.map(product => <ProductCard key={product.id} product={product} cart={cart} updateCart={updateCart} />)
              )}
            </div>
          </main>

          <aside className="hidden lg:block lg:w-[400px] flex-shrink-0">
            <div className="bg-white border border-orange-100 rounded-2xl shadow-xs sticky top-24 overflow-hidden flex flex-col h-[calc(100vh-8rem)]">
              <div className="p-5 border-b border-gray-100 bg-[#fffdf8] shrink-0">
                <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><svg className="w-5 h-5 text-[#b45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>Your Basket</h2>
              </div>
              <CartContent 
                cart={cart} inventory={inventory} cartTotal={cartTotal} updateCart={updateCart} 
                removeFromCart={removeFromCart} clearCart={clearCart} customerName={customerName} 
                setCustomerName={setCustomerName} customerAddress={customerAddress} setCustomerAddress={setCustomerAddress} 
                handleCheckout={handleCheckout} isCheckingOut={isCheckingOut} 
              />
            </div>
          </aside>

          {cart.length > 0 && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-orange-100 p-4 flex items-center justify-between z-40 lg:hidden shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
              <div>
                <div className="text-xs text-gray-400 font-semibold uppercase">Total Basket ({totalCartItemsCount})</div>
                <div className="text-xl font-black text-gray-900">₹{cartTotal}</div>
              </div>
              <button onClick={() => setIsMobileCartOpen(true)} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6 py-3 rounded-xl shadow-xs flex items-center gap-2 transition-transform active:scale-95 text-sm cursor-pointer">
                View Basket <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>
          )}

          {isMobileCartOpen && (
            <div className="fixed inset-0 bg-black/60 z-50 flex flex-col justify-end lg:hidden transition-opacity">
              <div className="bg-white rounded-t-2xl h-[85vh] flex flex-col overflow-hidden shadow-2xl animate-slide-up">
                <div className="p-4 border-b border-gray-100 bg-[#fffdf8] flex justify-between items-center shrink-0">
                  <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2"><svg className="w-5 h-5 text-[#b45309]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path></svg>Your Basket ({totalCartItemsCount})</h2>
                  <button onClick={() => setIsMobileCartOpen(false)} className="p-2 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 cursor-pointer"><svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg></button>
                </div>
                <CartContent 
                  cart={cart} inventory={inventory} cartTotal={cartTotal} updateCart={updateCart} 
                  removeFromCart={removeFromCart} clearCart={clearCart} customerName={customerName} 
                  setCustomerName={setCustomerName} customerAddress={customerAddress} setCustomerAddress={setCustomerAddress} 
                  handleCheckout={handleCheckout} isCheckingOut={isCheckingOut} 
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Full-screen Overlay Dialog Banner to anchor execution text changes */}
      {checkoutStatus && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-fade-in">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full border border-orange-100 flex flex-col items-center text-center space-y-4">
            
            {/* Animated Loading Ring Spinner */}
            <div className="w-12 h-12 rounded-full border-4 border-emerald-100 border-t-emerald-600 animate-spin flex items-center justify-center"></div>

            <p className="text-sm font-bold text-gray-800 tracking-wide transition-all duration-300">
              {checkoutStatus}
            </p>

            {/* Direct unblockable anchor link fallback loop */}
            {checkoutStatus.includes("Redirecting") && whatsappUrl && (
              <a 
                href={whatsappUrl}
                target={/Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className="mt-2 text-xs font-extrabold text-emerald-600 bg-emerald-50 hover:bg-emerald-100 px-4 py-2 rounded-xl transition-all border border-emerald-200/50 block tracking-wide"
              >
                Click here if not redirected automatically →
              </a>
            )}

            <div className="w-full bg-gray-100 h-1.5 rounded-full overflow-hidden">
              <div className="bg-emerald-600 h-full rounded-full animate-pulse w-3/4"></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}