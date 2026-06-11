import { useState, useEffect } from 'react';
import ProductImages from './ProductImages';

export default function ProductCard({ product, cart, updateCart }) {
  const defaultVariantId = product.variants && product.variants.length > 0 ? product.variants[0].variantId : null;
  const [activeVariantId, setActiveVariantId] = useState(defaultVariantId);
  const [isExpanded, setIsExpanded] = useState(false);

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
  
  // Pulling images directly from the active variant object
  const productImages = activeVariant.images && activeVariant.images.length > 0 ? activeVariant.images : [];
  const descriptionText = activeVariant.description || "";
  const isLongText = descriptionText.length > 80;
  
  return (
    <div className="bg-[#fffdf8] rounded-2xl border border-orange-50 overflow-hidden hover:shadow-md transition-all flex flex-col h-full relative">
      
      {/* Image Section & Bestseller Badge */}
      <div className={`bg-white border-b border-orange-50 relative group ${isOutOfStock ? 'grayscale opacity-50' : ''}`}>
        
        {/* Dynamic DB Bestseller Tag */}
        {product.isBestseller && (
          <span className="absolute top-3 left-3 z-10 w-fit whitespace-nowrap bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wide uppercase shadow-sm flex items-center gap-1 select-none">
            ★ Bestseller
          </span>
        )}

        {productImages.length > 0 ? (
          <ProductImages images={productImages} productName={product.name} />
        ) : (
          <div className="h-48 flex items-center justify-center text-orange-200 text-xs">
            No Images for this Variant
          </div>
        )}
      </div>

      <div className="p-5 flex flex-col flex-grow">
        <div className="flex items-start justify-between gap-2 mb-1">
          <div className="flex items-center gap-2">
            {/* Vegetarian Green Dot Indicator */}
            <div className="flex items-center justify-center w-3.5 h-3.5 border-[1.5px] border-emerald-700 rounded-[2px] shrink-0 bg-white">
              <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full"></div>
            </div>
            <h3 className="font-bold text-gray-900 text-base leading-tight">{product.name}</h3>
          </div>
          
          {!isOutOfStock && activeVariant.stockLeft <= 5 && (
            <span className="text-[9px] font-extrabold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md tracking-wide animate-pulse shrink-0">
              ONLY {activeVariant.stockLeft} LEFT
            </span>
          )}
        </div>

        {/* Onion/Garlic Tags */}
        <div className="flex gap-2 mb-2">
          {product.containsOnionGarlic && (
            <span className="text-[9px] font-extrabold text-purple-700 bg-purple-50 border border-purple-200 px-1.5 py-0.5 rounded-md tracking-wide shrink-0">
              CONTAINS ONION/GARLIC
            </span>
          )}
          {product.noOnionGarlic && (
            <span className="text-[9px] font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded-md tracking-wide shrink-0">
              NO ONION/GARLIC
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