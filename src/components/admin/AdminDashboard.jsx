import { useState, useEffect } from 'react';
import { CONFIG } from '../../config';

export default function AdminDashboard({ inventory, setInventory }) {
  const [localInventory, setLocalInventory] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [newImageUrl, setNewImageUrl] = useState({}); 
  const [imageError, setImageError] = useState({}); 
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState({});

  useEffect(() => {
    if (inventory.length > 0) {
      setLocalInventory(JSON.parse(JSON.stringify(inventory)));
    } else if (inventory.length === 0 && localInventory.length === 0) {
      setLocalInventory([]);
    }
  }, [inventory]);

  const existingCategories = [...new Set(localInventory.map(p => p.category).filter(Boolean))];

  const handleAddProduct = () => {
    const newId = Date.now().toString();
    const newProduct = {
      id: newId,
      name: "New Product Name",
      category: "Snacks", 
      images: [],
      variants: [{ variantId: newId + 'v', weight: "200g", price: 0, stockLeft: 0, description: "" }]
    };
    setLocalInventory([newProduct, ...localInventory]);
    setExpandedProductId(newId);
  };

  const handleDeleteProduct = (productId) => {
    if (window.confirm("Are you sure you want to permanently delete this product?")) {
      setLocalInventory(prev => prev.filter(p => p.id !== productId));
    }
  };

  const updateProductField = (productId, field, value) => {
    setLocalInventory(prev => prev.map(p => p.id === productId ? { ...p, [field]: value } : p));
  };

  const handleCategoryDropdown = (productId, selectedValue) => {
    if (selectedValue === 'NEW_CATEGORY_ACTION') {
      setIsAddingNewCategory(prev => ({ ...prev, [productId]: true }));
      updateProductField(productId, 'category', ''); 
    } else {
      setIsAddingNewCategory(prev => ({ ...prev, [productId]: false }));
      updateProductField(productId, 'category', selectedValue);
    }
  };

  const handleAddImage = (productId) => {
    const url = newImageUrl[productId];
    if (!url || !url.trim()) {
      setImageError(prev => ({ ...prev, [productId]: "URL cannot be empty!" }));
      return;
    }
    setImageError(prev => ({ ...prev, [productId]: "" })); 
    setLocalInventory(prev => prev.map(p => {
      if (p.id === productId) {
        const currentImages = p.images || [];
        return { ...p, images: [...currentImages, url.trim()] };
      }
      return p;
    }));
    setNewImageUrl(prev => ({ ...prev, [productId]: '' })); 
  };

  const handleRemoveImage = (productId, imgIndex) => {
    setLocalInventory(prev => prev.map(p => {
      if (p.id === productId) {
        const newImages = [...(p.images || [])];
        newImages.splice(imgIndex, 1);
        return { ...p, images: newImages };
      }
      return p;
    }));
  };

  const handleAddVariant = (productId) => {
    setLocalInventory(prev => prev.map(p => {
      if (p.id === productId) {
        const currentVariants = p.variants || [];
        return { ...p, variants: [...currentVariants, { variantId: Date.now().toString() + 'v', weight: "New Weight", price: 0, stockLeft: 0, description: "" }] };
      }
      return p;
    }));
  };

  const handleDeleteVariant = (productId, variantId) => {
    if (window.confirm("Delete this variant?")) {
      setLocalInventory(prev => prev.map(p => p.id === productId ? { ...p, variants: p.variants.filter(v => v.variantId !== variantId) } : p));
    }
  };

  const updateVariantField = (productId, variantId, field, value) => {
    setLocalInventory(prev => prev.map(p => p.id === productId ? { ...p, variants: p.variants.map(v => v.variantId === variantId ? { ...v, [field]: value } : v) } : p));
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
    <div className="max-w-4xl mx-auto w-full p-4 md:p-8 flex-1">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-gray-200 pb-4">
        <div>
          <h2 className="text-2xl font-black text-gray-900 tracking-tight">Inventory Management</h2>
          <p className="text-xs text-gray-500">Manage your entire catalog from this portal.</p>
        </div>
        <div className="flex gap-2 w-full sm:w-auto">
          <button onClick={handleAddProduct} className="flex-1 sm:flex-none px-4 py-3 bg-gray-900 text-white font-bold text-sm rounded-xl shadow-xs hover:bg-gray-800 transition-colors cursor-pointer">
            + Add Product
          </button>
          <button onClick={handleSaveToFirebase} disabled={isSaving} className={`flex-1 sm:flex-none px-6 py-3 text-white font-bold text-sm rounded-xl shadow-xs transition-colors ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'}`}>
            {isSaving ? "Syncing..." : "Save to Cloud"}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {localInventory.map(product => {
          const isExpanded = expandedProductId === product.id;

          return (
            <div key={product.id} className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden transition-all">
              <div 
                className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-transparent"
                onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                  <h3 className="font-bold text-gray-900 text-base">{product.name || 'Unnamed Product'}</h3>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-50 border border-orange-100 text-orange-700 px-2.5 py-0.5 rounded-md w-max">
                    {product.category || 'No Category'}
                  </span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-400 hidden sm:block">{product.variants?.length || 0} Variants</span>
                  <svg className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
              </div>

              {isExpanded && (
                <div className="p-4 md:p-6 relative bg-white border-t border-gray-200">
                  <button onClick={() => handleDeleteProduct(product.id)} className="absolute top-4 right-4 text-red-400 hover:text-red-600 cursor-pointer p-1" title="Delete Product">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                  </button>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 pr-8">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Product Name</label>
                      <input type="text" value={product.name || ''} onChange={(e) => updateProductField(product.id, 'name', e.target.value)} className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm font-semibold focus:outline-emerald-600" />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Category</label>
                      <div className="flex flex-col gap-2">
                        <select 
                          value={isAddingNewCategory[product.id] ? 'NEW_CATEGORY_ACTION' : (product.category || '')}
                          onChange={(e) => handleCategoryDropdown(product.id, e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 px-3 py-2 rounded-lg text-sm font-semibold focus:outline-emerald-600"
                        >
                          <option value="" disabled>Select a Category...</option>
                          {existingCategories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                          <option value="NEW_CATEGORY_ACTION" className="font-bold text-emerald-600">+ Add New Category</option>
                        </select>
                        
                        {isAddingNewCategory[product.id] && (
                          <input 
                            type="text" 
                            placeholder="Type new category..."
                            value={product.category || ''} 
                            onChange={(e) => updateProductField(product.id, 'category', e.target.value)} 
                            className="w-full bg-white border border-emerald-300 px-3 py-2 rounded-lg text-sm font-semibold focus:outline-emerald-600 focus:border-emerald-600" 
                          />
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="mb-6 p-4 bg-orange-50/50 border border-orange-100 rounded-xl">
                     <label className="block text-xs font-bold text-gray-800 mb-3">Product Images (URLs)</label>
                     <div className="flex flex-wrap gap-3 mb-3">
                       {(product.images || []).map((imgUrl, idx) => (
                         <div key={idx} className="relative w-16 h-16 bg-white border border-gray-200 rounded-lg overflow-hidden group">
                           <img src={imgUrl} alt="product" className="w-full h-full object-cover" />
                           <button onClick={() => handleRemoveImage(product.id, idx)} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                             <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                           </button>
                         </div>
                       ))}
                     </div>
                     <div className="flex gap-2 items-start">
                       <div className="flex-1">
                         <input 
                            type="text" 
                            placeholder="Paste image web URL (e.g., https://.../image.jpg)" 
                            value={newImageUrl[product.id] || ''} 
                            onChange={(e) => {
                              setNewImageUrl(prev => ({...prev, [product.id]: e.target.value}));
                              setImageError(prev => ({...prev, [product.id]: ''}));
                            }}
                            className={`w-full bg-white border ${imageError[product.id] ? 'border-red-400' : 'border-gray-200'} px-3 py-2 rounded-lg text-xs focus:outline-emerald-600`} 
                          />
                          {imageError[product.id] && <span className="text-[10px] text-red-500 font-bold mt-1 block">{imageError[product.id]}</span>}
                       </div>
                       <button onClick={() => handleAddImage(product.id)} className="px-4 py-2 bg-white border border-orange-200 text-orange-600 font-bold text-xs rounded-lg hover:bg-orange-50 cursor-pointer">Add Image</button>
                     </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <label className="block text-xs font-bold text-gray-800">Variants (Weights, Pricing & Info)</label>
                      <button onClick={() => handleAddVariant(product.id)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer">+ Add Variant</button>
                    </div>
                    
                    <div className="space-y-4">
                      {(product.variants || []).map(variant => (
                        <div key={variant.variantId} className="flex flex-col p-4 bg-gray-50 border border-gray-200 rounded-xl gap-3 relative shadow-sm">
                          <button onClick={() => handleDeleteVariant(product.id, variant.variantId)} className="absolute top-2 right-2 text-red-400 hover:text-red-600 p-1 cursor-pointer" title="Delete Variant">
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                          
                          <div className="flex flex-col sm:flex-row gap-3 pr-8">
                            <div className="flex-1">
                              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Weight Label</label>
                              <input type="text" value={variant.weight || ''} onChange={(e) => updateVariantField(product.id, variant.variantId, 'weight', e.target.value)} className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm font-semibold focus:outline-emerald-600" />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Price (₹)</label>
                              <input type="number" value={variant.price || 0} onChange={(e) => updateVariantField(product.id, variant.variantId, 'price', parseInt(e.target.value) || 0)} className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm font-semibold focus:outline-emerald-600" />
                            </div>
                            <div className="flex-1">
                              <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Stock Left</label>
                              <input type="number" value={variant.stockLeft || 0} onChange={(e) => updateVariantField(product.id, variant.variantId, 'stockLeft', parseInt(e.target.value) || 0)} className={`w-full bg-white border px-3 py-2 rounded-lg text-sm font-bold focus:outline-emerald-600 ${variant.stockLeft === 0 ? 'text-red-600 border-red-200 bg-red-50' : 'text-gray-800 border-gray-200'}`} />
                            </div>
                          </div>

                          <div className="w-full">
                            <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Variant Description</label>
                            <textarea rows="2" placeholder="Describe this specific variant..." value={variant.description || ''} onChange={(e) => updateVariantField(product.id, variant.variantId, 'description', e.target.value)} className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm focus:outline-emerald-600"></textarea>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}