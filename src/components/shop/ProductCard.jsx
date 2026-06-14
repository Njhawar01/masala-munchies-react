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
  
  const productImages = activeVariant.images && activeVariant.images.length > 0 ? activeVariant.images : [];
  const descriptionText = activeVariant.description || "";
  const isLongText = descriptionText.length > 80;
  
  return (
    <div className="bg-[#fffdf8] rounded-2xl border border-orange-50 overflow-hidden hover:shadow-md transition-all flex flex-col h-full relative">
      
      {/* 1. IMAGE & BESTSELLER HEADER SECTION */}
      <div className="bg-white border-b border-orange-50 relative group">
        {product.isBestseller && (
          <span className="absolute top-3 left-3 z-10 w-fit whitespace-nowrap bg-gradient-to-r from-amber-500 to-orange-500 text-white text-[9px] font-bold px-2 py-0.5 rounded-md tracking-wide uppercase shadow-sm flex items-center gap-1 select-none">
            ★ Bestseller
          </span>
        )}

        {productImages.length > 0 ? (
          <ProductImages images={productImages} productName={product.name} isOutOfStock={isOutOfStock} />
        ) : (
          <div className="h-48 flex items-center justify-center text-orange-200 text-xs">
            No Images for this Variant
          </div>
        )}
      </div>

      {/* CARD BODY WORKSPACE */}
      <div className="p-4 sm:p-5 flex flex-col flex-grow">
        
        {/* 2. PRODUCT NAME & DYNAMIC STOCK WARNING */}
        <div className="flex flex-wrap items-start justify-between gap-x-2 gap-y-1 mb-1.5 w-full">
          <div className="flex items-center gap-2 min-w-0 max-w-full">
            {/* Vegetarian Green Dot Indicator */}
            <div className="flex items-center justify-center w-3.5 h-3.5 border-[1.5px] border-emerald-700 rounded-[2px] shrink-0 bg-white select-none">
              <div className="w-1.5 h-1.5 bg-emerald-700 rounded-full"></div>
            </div>
            <h3 className="font-bold text-gray-900 text-sm sm:text-base leading-tight line-clamp-2" title={product.name}>{product.name}</h3>
          </div>
          
          {!isOutOfStock && activeVariant.stockLeft <= 5 && (
            <span className="text-[9px] font-extrabold text-red-600 bg-red-50 border border-red-200 px-1.5 py-0.5 rounded-md tracking-wide uppercase animate-pulse shrink-0 whitespace-nowrap mt-0.5">
              ONLY {activeVariant.stockLeft} LEFT
            </span>
          )}
        </div>

        {/* 3. SPECIFIC VARIANT SELECTION: Styled into a clean, compact inline pill */}
        <div className="mb-2.5 flex flex-wrap">
          <div className="inline-flex items-center relative bg-orange-50/80 hover:bg-orange-100/80 border border-orange-100 rounded-full px-2.5 py-1 transition-all shadow-xs">
            <select 
              value={activeVariantId}
              onChange={(e) => setActiveVariantId(e.target.value)}
              className="bg-transparent text-[#9a3412] text-xs font-bold cursor-pointer appearance-none pr-5 focus:outline-none"
            >
              {product.variants.map(v => (
                <option key={v.variantId} value={v.variantId} className="bg-white text-gray-800 font-medium">
                  {v.weight}{String(v.weight).endsWith('g') ? '' : 'g'}
                </option>
              ))}
            </select>
            <div className="pointer-events-none absolute right-2.5 flex items-center text-[#9a3412]">
              <svg className="fill-current h-3 w-3" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
              </svg>
            </div>
          </div>
        </div>

        {/* 4. DESCRIPTION / METADATA LAYER */}
        {/* Onion/Garlic Custom Badges */}
        <div className="flex flex-wrap gap-1.5 mb-2.5">
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
        
        {/* Dynamic Variable Description Segment */}
        {descriptionText ? (
          <div className="mb-4">
            <p className={`text-xs text-gray-500 leading-normal ${!isExpanded && isLongText ? 'line-clamp-2' : ''}`}>
              {descriptionText}
            </p>
            {isLongText && (
              <button onClick={() => setIsExpanded(!isExpanded)} className="text-[10px] mt-1 text-left text-orange-600 font-bold hover:text-orange-700 block transition-colors cursor-pointer">
                {isExpanded ? 'Read Less ↑' : 'Read More ↓'}
              </button>
            )}
          </div>
        ) : (
           <div className="mb-4 text-xs text-transparent select-none">Spacer</div>
        )}

        {/* 5. ACTION BASE: Stacked layout on mobile to fully accommodate "Add To Basket" text without squeezing pricing */}
        <div className="mt-auto pt-3 border-t border-orange-100/60 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          
          {/* Pricing Frame */}
          <div className="flex flex-col min-w-0 flex-1 justify-center">
            <div className="flex items-baseline gap-1.5">
              <span className="font-black text-base sm:text-lg text-gray-900 tracking-tight leading-none">
                ₹{activeVariant.price}
              </span>
              {activeVariant.mrp && activeVariant.mrp > activeVariant.price && (
                <span className="line-through text-gray-400 text-xs font-medium leading-none">
                  ₹{activeVariant.mrp}
                </span>
              )}
            </div>
            {activeVariant.mrp && activeVariant.mrp > activeVariant.price && (
              <div className="mt-1">
                <span className="inline-block text-[9px] font-black text-emerald-600 bg-emerald-50 border border-emerald-100 px-1.5 py-0.5 rounded-md uppercase tracking-wide whitespace-nowrap">
                  {Math.round(((activeVariant.mrp - activeVariant.price) / activeVariant.mrp) * 100)}% OFF
                </span>
              </div>
            )}
          </div>

          {/* Checkout Action Component (Spans cleanly on mobile, docks perfectly on desktop) */}
          <div className="w-full sm:w-32 shrink-0">
            {isOutOfStock ? (
              <button disabled className="w-full py-2.5 bg-gray-100 text-gray-400 rounded-xl text-xs sm:text-sm font-bold cursor-not-allowed border border-gray-200">
                Out of Stock
              </button>
            ) : currentCartQty > 0 ? (
              <div className="flex items-center justify-between bg-white rounded-xl border border-emerald-500 p-1 shadow-sm w-full">
                <button onClick={() => updateCart(product.id, activeVariantId, -1)} className="w-10 h-8 flex items-center justify-center text-emerald-700 font-bold hover:bg-emerald-50 rounded-lg cursor-pointer text-sm transition-colors">-</button>
                <span className="font-bold text-emerald-800 text-sm">{currentCartQty}</span>
                <button 
                  onClick={() => updateCart(product.id, activeVariantId, 1)} 
                  disabled={reachedLimit} 
                  className={`w-10 h-8 flex items-center justify-center font-bold rounded-lg text-sm transition-colors ${reachedLimit ? 'text-gray-300 cursor-not-allowed' : 'text-emerald-700 hover:bg-emerald-50 cursor-pointer'}`}
                >
                  +
                </button>
              </div>
            ) : (
              <button onClick={() => updateCart(product.id, activeVariantId, 1)} className="w-full py-2.5 bg-[#fff8ef] hover:bg-[#ffeedb] text-[#d97706] rounded-xl text-xs sm:text-sm font-bold transition-all border border-orange-100 shadow-sm hover:shadow active:scale-[0.99] cursor-pointer text-center whitespace-nowrap px-2">
                Add To Basket
              </button>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}