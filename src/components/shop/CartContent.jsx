export default function CartContent({ 
  cart, 
  inventory, 
  cartTotal, 
  updateCart, 
  removeFromCart, 
  clearCart, 
  customerName, 
  setCustomerName, 
  customerAddress, 
  setCustomerAddress, 
  handleCheckout, 
  isCheckingOut 
}) {
  
  // Issue 2: Compute Total MRP from actual item schemas mapped to item counts
  const totalMrp = cart.reduce((total, item) => {
    const product = inventory.find(p => p.id === item.productId);
    const variant = product?.variants?.find(v => v.variantId === item.variantId);
    const itemMrp = variant ? (variant.mrp || variant.price) : 0;
    return total + (itemMrp * item.qty);
  }, 0);

  const mrpSavings = totalMrp - cartTotal;

  // Issue 3: 5% Special Discount continues on orders with sale subtotal >= 200
  // const discount = cartTotal >= 200 ? Math.round(Math.min(cartTotal * 0.05, 50)) : 0;
  const discount = 0; // Currently disabled as per the latest requirements
  const totalBeforeDelivery = cartTotal - discount;

  // Tiered Delivery Threshold Logic - Evaluated directly on Subtotal (Sale Price)
  const deliveryFee = cartTotal < 200 ? 50 : 0;
  const grandTotal = totalBeforeDelivery + deliveryFee;
  const amountNeededForFreeDelivery = 200 - cartTotal;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      
      {/* Scrollable Products List Container (Reduced padding to p-3.5 and compressed row gap) */}
      <div className="flex-1 min-h-[90px] overflow-y-auto p-3.5">
        {cart.length === 0 ? (
          <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-gray-400 space-y-3">
            <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
            <p className="text-sm">Your basket is empty</p>
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {/* Header Row */}
            <div className="flex justify-between items-center pb-2 border-b border-gray-100">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Items ({cart.reduce((acc, curr) => acc + curr.qty, 0)})
              </span>
              <button 
                onClick={clearCart}
                className="inline-flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 transition-colors cursor-pointer"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                </svg>
                Clear Basket
              </button>
            </div>

            {/* Cart Items Mapping (Tightened padding to pb-2.5) */}
            {cart.map(item => {
              const product = inventory.find(p => p.id === item.productId);
              const variant = product?.variants?.find(v => v.variantId === item.variantId);
              if (!product || !variant) return null;
              const reachedLimit = item.qty >= variant.stockLeft;
              const itemTotal = variant.price * item.qty;

              return (
                <div key={item.variantId} className="flex justify-between items-center pb-2.5 border-b border-gray-100 last:border-0 last:pb-0 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-800 mb-0.5 truncate">{product.name}</div>
                    <div className="text-xs text-gray-400 flex items-center gap-1.5 flex-wrap">
                      <span>{variant.weight}</span>
                      <span>•</span>
                      {variant.mrp > variant.price && (
                        <span className="line-through text-gray-400 font-medium">₹{variant.mrp}</span>
                      )}
                      <span className="text-emerald-700 font-bold">₹{variant.price}</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center border border-gray-200 rounded-lg bg-white overflow-hidden">
                      <button 
                        onClick={() => updateCart(product.id, variant.variantId, -1)} 
                        className="px-2.5 py-1 text-gray-500 hover:bg-gray-50 font-bold text-sm cursor-pointer select-none"
                      >
                        -
                      </button>
                      <span className="px-1 text-xs font-bold text-gray-900 min-w-[16px] text-center">
                        {item.qty}
                      </span>
                      <button 
                        onClick={() => updateCart(product.id, variant.variantId, 1)} 
                        disabled={reachedLimit} 
                        className={`px-2.5 py-1 font-bold text-sm select-none ${
                          reachedLimit ? 'text-gray-200 cursor-not-allowed' : 'text-gray-500 hover:bg-gray-50 cursor-pointer'
                        }`}
                      >
                        +
                      </button>
                    </div>
                    
                    <div className="text-sm font-black text-gray-900 w-14 text-right">₹{itemTotal}</div>
                    
                    <button onClick={() => removeFromCart(variant.variantId)} className="text-red-400 hover:text-red-600 p-1 cursor-pointer transition-colors">
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                      </svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Pinned Fixed Footer Area (Shaved off extra block spacing and padded out to p-3) */}
      {cart.length > 0 && (
        <div className="p-3 bg-gray-50 border-t border-gray-100 mt-auto shrink-0 space-y-2.5">
          
          {/* Dynamic Free Delivery Banner Tracker */}
          {deliveryFee > 0 && amountNeededForFreeDelivery > 0 && (
            <div className="p-2 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-2 text-amber-800 text-[11px] font-medium animate-pulse">
              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                Add <span className="font-bold">₹{amountNeededForFreeDelivery}</span> more for free delivery!
              </div>
            </div>
          )}

          {/* Pricing Summary (Scaled down rows to line-height space-y-1 and font configurations) */}
          <div className="space-y-1 text-xs sm:text-sm">
            <div className="flex justify-between text-gray-400">
              <span>Total MRP</span>
              <span>₹{totalMrp}</span>
            </div>

            {mrpSavings > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>MRP Discount</span>
                <span>-₹{mrpSavings}</span>
              </div>
            )}

            <div className="flex justify-between text-gray-600 font-semibold pt-0.5">
              <span>Subtotal (Sale Price)</span>
              <span>₹{cartTotal}</span>
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between text-red-600 font-medium">
                <span>Special Discount (5%)</span>
                <span>-₹{discount}</span>
              </div>
            )}
            
            <div className="flex justify-between text-gray-500">
              <span>Delivery Fee</span>
              <span className={deliveryFee > 0 ? "text-gray-900 font-medium" : "text-emerald-600 font-semibold"}>
                {deliveryFee > 0 ? `₹${deliveryFee}` : 'FREE'}
              </span>
            </div>
            
            <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 mt-1">
              <span className="font-bold text-gray-900 text-sm sm:text-base">Grand Total</span>
              <span className="font-bold text-base sm:text-xl text-gray-900">₹{grandTotal}</span>
            </div>
          </div>

          {/* Delivery Details Block (Compact form fields to free up extra vertical pixels) */}
          <div>
            <label className="block text-[9px] font-bold text-gray-400 uppercase tracking-wider mb-1">
              Delivery Information
            </label>
            <input 
              type="text" 
              value={customerName} 
              onChange={(e) => setCustomerName(e.target.value)} 
              placeholder="Your Name" 
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs mb-1.5" 
            />
            <input 
              type="text" 
              value={customerAddress} 
              onChange={(e) => setCustomerAddress(e.target.value)} 
              placeholder="Complete Delivery Address" 
              className="w-full px-2.5 py-1.5 bg-white border border-gray-200 rounded-md focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-xs" 
            />
          </div>

          {/* WhatsApp Checkout Button (Slimmed padding down to py-2.5 and optimized font sizes) */}
          <button 
            onClick={handleCheckout} 
            disabled={isCheckingOut || cart.length === 0} 
            className={`w-full py-2.5 text-xs sm:text-sm text-white rounded-lg font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
              isCheckingOut || cart.length === 0
                ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                : 'bg-[#059669] hover:bg-[#047857] cursor-pointer'
            }`}
          >
            {isCheckingOut ? "Processing..." : "Place Order via WhatsApp"}
          </button>
        </div>
      )}
    </div>
  );
}