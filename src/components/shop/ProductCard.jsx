import { useState, useEffect } from 'react';

export default function ProductCard({ product, cart, updateCart }) {
  const defaultVariantId = product.variants && product.variants.length > 0 ? product.variants[0].variantId : null;
  const [activeVariantId, setActiveVariantId] = useState(defaultVariantId);
  const [isExpanded, setIsExpanded] = useState(false);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    if (product.variants?.length > 0) {
      setActiveVariantId(product.variants[0].variantId);
    }
  }, [product.variants]);

  // Reset expansion state when variant changes
  useEffect(() => {
    setIsExpanded(false);
  }, [activeVariantId]);

  if (!product.variants || product.variants.length === 0) return null;

  const activeVariant = product.variants.find(v => v.variantId === activeVariantId) || product.variants[0];
  const cartItem = cart.find(item => item.variantId === activeVariantId);
  const currentCartQty = cartItem ? cartItem.qty : 0;
  
  const isOutOfStock = activeVariant.stockLeft === 0;
  const reachedLimit = currentCartQty >= activeVariant.stockLeft;
  const productImages = product.images && product.images.length > 0 ? product.images : [];
  
  // Logic for Read More
  const descriptionText = activeVariant.description || "";
  const isLongText = descriptionText.length > 80;
  
  return (
    <div className="bg-[#fffdf8] rounded-2xl border border-orange-50 overflow-hidden hover:shadow-md transition-all flex flex-col h-full relative">
      <div className="h-48 bg-white flex items-center justify-center relative border-b border-orange-50 group">
        {productImages.length > 0 ? (
          <>
            <img src={productImages[imgIndex]} alt={product.name} className={`w-full h-full object-contain p-4 ${isOutOfStock ? 'grayscale opacity-50' : ''}`} />
            {productImages.length > 1 && (
              <>
                <button onClick={() => setImgIndex((prev) => (prev === 0 ? productImages.length - 1 : prev - 1))} className="absolute left-2 p-1.5 bg-white/80 hover:bg-white rounded-full shadow-sm text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
                </button>
                <button onClick={() => setImgIndex((prev) => (prev === productImages.length - 1 ? 0 : prev + 1))} className="absolute right-2 p-1.5 bg-white/80 hover:bg-white rounded-full shadow-sm text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
                </button>
                <div className="absolute bottom-2 flex gap-1">
                  {productImages.map((_, idx) => (
                    <div key={idx} className={`h-1.5 rounded-full transition-all ${idx === imgIndex ? 'w-4 bg-orange-500' : 'w-1.5 bg-gray-300'}`} />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="text-orange-200 text-xs">No Images Added</div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-base leading-tight">{product.name}</h3>
          {!isOutOfStock && activeVariant.stockLeft <= 5 && (
            <span className="text-[9px] font-extrabold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md tracking-wide animate-pulse shrink-0">
              ONLY {activeVariant.stockLeft} LEFT
            </span>
          )}
        </div>
        
        {descriptionText ? (
          <div className="mb-3">
            <p className={`text-xs text-gray-500 ${!isExpanded && isLongText ? 'line-clamp-2' : ''}`}>
              {descriptionText}
            </p>
            {isLongText && (
              <button onClick={() => setIsExpanded(!isExpanded)} className="text-[10px] mt-1 text-left text-orange-600 font-bold hover:text-orange-700 block transition-colors cursor-pointer">
                {isExpanded ? 'Read Less ↑' : 'Read More ↓'}
              </button>
            )}
          </div>
        ) : (
           <div className="mb-3 text-xs text-transparent select-none">Spacer</div>
        )}

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