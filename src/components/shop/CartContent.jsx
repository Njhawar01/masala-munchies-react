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
  
  const MINIMUM_ORDER_VALUE = 200;
  const isBelowMinimum = cartTotal > 0 && cartTotal < MINIMUM_ORDER_VALUE;
  const amountNeeded = MINIMUM_ORDER_VALUE - cartTotal;

  // 5% Special Discount calculation with synchronized whole-number rounding
  const discount = cartTotal >= MINIMUM_ORDER_VALUE ? Math.round(Math.min(cartTotal * 0.05, 50)) : 0;
  const grandTotal = cartTotal - discount;

  return (
    <div className="flex flex-col h-full min-h-0 bg-white">
      
      {/* Scrollable Products List Container */}
      {/* FIX: Lowered min-h to 90px so it fits single items tightly without pushing the footer out */}
      <div className="flex-1 min-h-[90px] overflow-y-auto p-5">
        {cart.length === 0 ? (
          <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-gray-400 space-y-3">
            <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
            <p className="text-sm">Your basket is empty</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
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

            {/* Cart Items Mapping */}
            {cart.map(item => {
              const product = inventory.find(p => p.id === item.productId);
              const variant = product?.variants?.find(v => v.variantId === item.variantId);
              if (!product || !variant) return null;
              const reachedLimit = item.qty >= variant.stockLeft;
              const itemTotal = variant.price * item.qty;

              return (
                <div key={item.variantId} className="flex justify-between items-center pb-4 border-b border-gray-100 last:border-0 last:pb-0 gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-gray-800 mb-1 truncate">{product.name}</div>
                    <div className="text-xs text-gray-400">{variant.weight} • ₹{variant.price}</div>
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

      {/* Pinned Fixed Footer Area — Cleaned up padding slightly to ensure an absolute perfect fit */}
      {cart.length > 0 && (
        <div className="p-4 bg-gray-50 border-t border-gray-100 mt-auto shrink-0 space-y-3.5">
          
          {/* Pricing Summary */}
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Subtotal</span>
              <span>₹{cartTotal}</span>
            </div>
            
            {discount > 0 && (
              <div className="flex justify-between text-emerald-600 font-medium">
                <span>5% Special Discount {discount === 50 && '(Max Capped)'}</span>
                <span>-₹{discount}</span>
              </div>
            )}
            
            <div className="flex justify-between text-gray-500">
              <span>Delivery Fee</span>
              <span className="text-emerald-600 font-semibold">FREE</span>
            </div>
            
            <div className="flex justify-between items-center pt-2.5 border-t border-gray-200 mt-1.5">
              <span className="font-bold text-gray-900 text-base">Grand Total</span>
              <span className="font-bold text-xl text-gray-900">₹{grandTotal}</span>
            </div>
          </div>

          {/* Minimum Order Sticky Banner */}
          {isBelowMinimum && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-center gap-2.5 text-amber-800 text-xs animate-fadeIn">
              <svg className="w-4 h-4 text-amber-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                Minimum order is <span className="font-bold">₹200</span>. Please add <span className="font-bold">₹{amountNeeded}</span> more to check out.
              </div>
            </div>
          )}

          {/* Delivery Details Block */}
          <div>
            <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1.5">
              Delivery Information
            </label>
            <input 
              type="text" 
              value={customerName} 
              onChange={(e) => setCustomerName(e.target.value)} 
              placeholder="Your Name" 
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm mb-2" 
            />
            <input 
              type="text" 
              value={customerAddress} 
              onChange={(e) => setCustomerAddress(e.target.value)} 
              placeholder="Complete Delivery Address" 
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm" 
            />
          </div>

          {/* WhatsApp Checkout Button */}
          <button 
            onClick={handleCheckout} 
            disabled={isCheckingOut || isBelowMinimum} 
            className={`w-full py-3 text-white rounded-xl font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${
              isCheckingOut || isBelowMinimum 
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