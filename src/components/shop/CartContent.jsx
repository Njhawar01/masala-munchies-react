export default function CartContent({ cart, inventory, cartTotal, updateCart, removeFromCart, customerName, setCustomerName, customerAddress, setCustomerAddress, handleCheckout, isCheckingOut }) {
  return (
    <>
      <div className="flex-1 overflow-y-auto">
        {cart.length === 0 ? (
          <div className="h-full min-h-[150px] flex flex-col items-center justify-center text-gray-400 space-y-3 p-5">
            <svg className="w-12 h-12 text-gray-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"></path>
            </svg>
            <p className="text-sm">Your basket is empty</p>
          </div>
        ) : (
          <div className="p-5 flex flex-col gap-4">
            {cart.map(item => {
              const product = inventory.find(p => p.id === item.productId);
              const variant = product?.variants?.find(v => v.variantId === item.variantId);
              if (!product || !variant) return null;
              const reachedLimit = item.qty >= variant.stockLeft;
              const itemTotal = variant.price * item.qty;

              return (
                <div key={item.variantId} className="flex justify-between items-center pb-4 border-b border-gray-100 last:border-0 last:pb-0">
                  <div className="flex-1 pr-4">
                    <div className="text-sm font-bold text-gray-800 mb-1">{product.name}</div>
                    <div className="text-xs text-gray-400">{variant.weight} • ₹{variant.price}</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center border border-gray-200 rounded-lg bg-white">
                      <button onClick={() => updateCart(product.id, variant.variantId, -1)} className="px-2 py-1 text-gray-500 hover:text-gray-800 font-bold text-sm cursor-pointer">-</button>
                      <span className="px-2 text-xs font-bold text-gray-900">{item.qty}</span>
                      <button onClick={() => updateCart(product.id, variant.variantId, 1)} disabled={reachedLimit} className={`px-2 py-1 font-bold text-sm ${reachedLimit ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-gray-800 cursor-pointer'}`}>+</button>
                    </div>
                    <div className="text-sm font-black text-gray-900 w-12 text-right">₹{itemTotal}</div>
                    <button onClick={() => removeFromCart(variant.variantId)} className="text-red-400 hover:text-red-600 p-1 ml-1 cursor-pointer">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="p-5 bg-gray-50 border-t border-gray-100 mt-auto shrink-0">
        <div className="space-y-2 mb-4 text-sm">
          <div className="flex justify-between text-gray-500"><span>Subtotal</span><span>₹{cartTotal}</span></div>
          <div className="flex justify-between text-gray-500"><span>Delivery Fee</span><span className="text-emerald-600 font-semibold">FREE</span></div>
          <div className="flex justify-between items-center pt-3 border-t border-gray-200 mt-2">
            <span className="font-bold text-gray-900 text-base">Grand Total</span>
            <span className="font-bold text-xl text-gray-900">₹{cartTotal}</span>
          </div>
        </div>

        <div className="mb-5">
          <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Delivery Information</label>
          <input type="text" value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="Your Name" className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm mb-3" />
          <input type="text" value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Complete Delivery Address" className="w-full px-3 py-2.5 bg-white border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 text-sm" />
        </div>

        <button onClick={handleCheckout} disabled={cart.length === 0 || isCheckingOut} className={`w-full py-3.5 text-white rounded-xl font-bold shadow-xs transition-all flex items-center justify-center gap-2 ${cart.length === 0 || isCheckingOut ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#059669] hover:bg-[#047857] cursor-pointer'}`}>
          {isCheckingOut ? "Processing..." : "Place Order via WhatsApp"}
        </button>
      </div>
    </>
  );
}