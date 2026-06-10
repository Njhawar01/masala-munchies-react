import { useState, useEffect } from 'react';
import { CONFIG } from '../../config';

export default function AdminDashboard({ inventory, setInventory }) {
  const [idToken, setIdToken] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const [activeTab, setActiveTab] = useState('inventory'); 
  const [localInventory, setLocalInventory] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null); 
  const [imageError, setImageError] = useState({}); 
  const [expandedProductId, setExpandedProductId] = useState(null);
  const [isAddingNewCategory, setIsAddingNewCategory] = useState({});
  
  const [orders, setOrders] = useState([]);
  const [loadingOrders, setLoadingOrders] = useState(false);

  useEffect(() => {
    if (inventory.length > 0) {
      setLocalInventory(JSON.parse(JSON.stringify(inventory)));
    }
  }, [inventory]);

  useEffect(() => {
    if (activeTab === 'orders' && idToken) {
      fetchOrderHistory();
    }
  }, [activeTab, idToken]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoggingIn(true);
    try {
      const res = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${CONFIG.firebaseApiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, returnSecureToken: true })
      });
      const data = await res.json();
      
      if (data.idToken) {
        setIdToken(data.idToken);
      } else {
        alert(data.error.message); 
      }
    } catch (error) {
      alert("Login failed. Check your internet connection.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  const fetchOrderHistory = async () => {
    if (!idToken) return; 
    setLoadingOrders(true);
    try {
      const ordersUrl = `${CONFIG.FIREBASE_URL}/orders.json?auth=${idToken}`;
      const response = await fetch(ordersUrl);
      const data = await response.json();
      
      if (data) {
        const parsedOrders = Object.keys(data)
          .filter(key => data[key] !== null && data[key].items && data[key].items.length > 0)
          .map(key => ({
            orderId: key,
            ...data[key]
          }))
          .reverse();
        setOrders(parsedOrders);
      } else {
        setOrders([]);
      }
    } catch (error) {
      console.error("Failed to load history logs:", error);
    } finally {
      setLoadingOrders(false);
    }
  };

  const togglePaymentStatus = async (orderId, currentStatus) => {
    if (!idToken) return; 
    const newStatus = currentStatus === 'paid' ? 'pending' : 'paid';
    
    setOrders(prevOrders => prevOrders.map(order => 
      order.orderId === orderId ? { ...order, paymentStatus: newStatus } : order
    ));

    try {
      const orderPatchUrl = CONFIG.FIREBASE_URL.includes('.json') 
        ? CONFIG.FIREBASE_URL.replace(/([^\/]+)\.json$/, `orders/${orderId}.json?auth=${idToken}`)
        : `${CONFIG.FIREBASE_URL}/orders/${orderId}.json?auth=${idToken}`;
        
      await fetch(orderPatchUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ paymentStatus: newStatus })
      });
    } catch (error) {
      console.error("Failed to update payment status:", error);
      setOrders(prevOrders => prevOrders.map(order => 
        order.orderId === orderId ? { ...order, paymentStatus: currentStatus } : order
      ));
      alert("Failed to update payment status. Check your connection.");
    }
  };

  const existingCategories = [...new Set(localInventory.map(p => p.category).filter(Boolean))];

  const handleAddProduct = () => {
    const newId = Date.now().toString();
    const newProduct = {
      id: newId,
      name: "New Product Name",
      category: "Snacks", 
      containsOnionGarlic: false, // <-- Added default state here
      variants: [{ variantId: newId + 'v', weight: "200g", price: 0, stockLeft: 0, description: "", images: [] }]
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

  const handleImageUpload = async (e, productId, variantId) => {
  const files = Array.from(e.target.files || []);
  if (files.length === 0) return;

  const variantKey = `${productId}_${variantId}`;
  setUploadingKey(variantKey);
  setImageError(prev => ({ ...prev, [variantKey]: "" }));

  const bucketName = CONFIG.storageBucket || CONFIG.FIREBASE_URL.match(/https:\/\/(.+?)(-default-rtdb)?\.firebaseio\.com/)?.[1] + ".firebasestorage.app";

  try {
    const uploadPromises = files.map(async (file) => {
      const storagePath = `products/${productId}/${variantId}_${Date.now()}_${file.name}`;
      const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o?name=${encodeURIComponent(storagePath)}`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
          'Authorization': `Bearer ${idToken}`
        },
        body: file
      });

      if (!response.ok) throw new Error("Storage transmission failed.");

      const data = await response.json();
      return `https://firebasestorage.googleapis.com/v0/b/${bucketName}/o/${encodeURIComponent(data.name)}?alt=media&token=${data.downloadTokens}`;
    });

    const uploadedUrls = await Promise.all(uploadPromises);

    setLocalInventory(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          variants: p.variants.map(v => v.variantId === variantId ? { ...v, images: [...(v.images || []), ...uploadedUrls] } : v)
        };
      }
      return p;
    }));

  } catch (error) {
    console.error(error);
    setImageError(prev => ({ ...prev, [variantKey]: "One or more uploads failed. Check Firebase Rules." }));
  } finally {
    setUploadingKey(null);
    e.target.value = ""; 
  }
};

  const handleRemoveImage = (productId, variantId, imgIndex) => {
    setLocalInventory(prev => prev.map(p => {
      if (p.id === productId) {
        return {
          ...p,
          variants: p.variants.map(v => {
            if (v.variantId === variantId) {
              const remainingImgs = [...(v.images || [])];
              remainingImgs.splice(imgIndex, 1);
              return { ...v, images: remainingImgs };
            }
            return v;
          })
        };
      }
      return p;
    }));
  };

  const handleAddVariant = (productId) => {
    setLocalInventory(prev => prev.map(p => {
      if (p.id === productId) {
        const currentVariants = p.variants || [];
        return { ...p, variants: [...currentVariants, { variantId: Date.now().toString() + 'v', weight: "New Weight", price: 0, stockLeft: 0, description: "", images: [] }] };
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
    if (!idToken) return; 
    setIsSaving(true);
    try {
      const response = await fetch(`${CONFIG.FIREBASE_URL}/inventory.json?auth=${idToken}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(localInventory)
      });
      if (!response.ok) throw new Error("Sync failed");
      
      setInventory(localInventory);
      alert("Inventory synced successfully to Realtime Database!");
    } catch (error) {
      console.error(error);
      alert("Failed to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  if (!idToken) {
    return (
      <div className="flex-1 bg-gray-50 flex items-center justify-center p-4 overflow-hidden">
        <div className="max-w-md w-full bg-white border border-gray-200 rounded-2xl shadow-xl p-8">
          <h2 className="text-2xl font-black mb-6 text-center text-gray-900">Admin Access</h2>
          <form onSubmit={handleLogin} className="space-y-4">
            <input 
              type="email" 
              placeholder="Admin Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:outline-emerald-600" 
              required 
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 px-4 py-3 rounded-xl focus:outline-emerald-600" 
              required 
            />
            <button 
                type="submit" 
                disabled={isLoggingIn} 
                className="w-full bg-gray-900 text-white font-bold py-3 rounded-xl hover:bg-gray-800 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50"
                >
                {isLoggingIn ? "Logging in..." : "Login"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto w-full p-4 md:p-8 flex-1">
      <div className="flex flex-col gap-4 mb-6 border-b border-gray-200 pb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">Admin Operations Workspace</h2>
            <p className="text-xs text-gray-500">Audit your storefront listings and check on incoming logs.</p>
          </div>
          {activeTab === 'inventory' && (
            <div className="flex gap-2 w-full sm:w-auto">
              <button onClick={handleAddProduct} className="flex-1 sm:flex-none px-4 py-2.5 bg-gray-900 text-white font-bold text-xs rounded-xl shadow-xs hover:bg-gray-800 cursor-pointer">
                + Add Product
              </button>
              <button onClick={handleSaveToFirebase} disabled={isSaving} className={`flex-1 sm:flex-none px-5 py-2.5 text-white font-bold text-xs rounded-xl shadow-xs transition-colors ${isSaving ? 'bg-gray-400 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700 cursor-pointer'}`}>
                {isSaving ? "Syncing..." : "Save to Cloud"}
              </button>
            </div>
          )}
        </div>

        <div className="flex gap-4 text-sm font-bold border-t border-gray-100 pt-3">
          <button 
            onClick={() => setActiveTab('inventory')} 
            className={`pb-2 border-b-2 transition-all cursor-pointer ${activeTab === 'inventory' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Inventory Management
          </button>
          <button 
            onClick={() => setActiveTab('orders')} 
            className={`pb-2 border-b-2 transition-all cursor-pointer ${activeTab === 'orders' ? 'border-orange-600 text-orange-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
          >
            Order History Logs
          </button>
        </div>
      </div>

      {activeTab === 'orders' ? (
        <div className="space-y-4">
          {loadingOrders ? (
            <div className="text-center py-12 font-bold text-gray-400 animate-pulse">Retrieving order database records...</div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 border border-gray-200 text-gray-400 rounded-xl text-xs">No orders stored in records yet.</div>
          ) : (
            orders.map(order => {
              const isPaid = order.paymentStatus === 'paid';
              return (
                <div key={order.orderId} className={`bg-white border ${isPaid ? 'border-emerald-200 shadow-sm' : 'border-orange-200 shadow-md'} rounded-xl p-5 flex flex-col md:flex-row justify-between gap-4 transition-colors`}>
                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap items-center gap-2 w-full">
                      <span className="text-xs font-mono bg-gray-100 text-gray-700 px-2 py-0.5 rounded-md font-bold">ID: {order.orderId.substring(1, 7)}</span>
                      <span className="text-[10px] text-gray-400 font-bold bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-md">{order.timestamp}</span>
                      
                      <button 
                        onClick={() => togglePaymentStatus(order.orderId, order.paymentStatus || 'pending')}
                        className={`ml-auto text-[10px] font-extrabold px-3 py-1 rounded-md border transition-all cursor-pointer active:scale-95 flex items-center gap-1 ${
                          isPaid 
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100' 
                            : 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100'
                        }`}
                      >
                        {isPaid ? (
                          <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg> PAID</>
                        ) : (
                          <><svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> PAYMENT PENDING</>
                        )}
                      </button>
                    </div>
                    <div>
                      <h4 className="font-extrabold text-sm text-gray-900">{order.customerName}</h4>
                      <p className="text-xs text-gray-500 mt-0.5 font-medium">{order.customerAddress}</p>
                    </div>
                    <div className="border-t border-gray-100 pt-2 mt-2">
                      <span className="block text-[9px] font-extrabold text-gray-400 uppercase tracking-wider mb-1">Purchased Products</span>
                      <ul className="space-y-1">
                        {(order.items || []).map((item, idx) => (
                          <li key={idx} className="text-xs font-semibold text-gray-700 flex justify-between">
                            <span>• {item.name} <span className="text-gray-400 font-normal">({item.weight})</span> <span className="text-emerald-700 font-bold">x{item.qty}</span></span>
                            <span className="text-gray-900 font-black">₹{item.total}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="md:text-right flex md:flex-col justify-between items-center md:justify-start md:items-end gap-2 shrink-0 border-t md:border-t-0 border-gray-100 pt-3 md:pt-0">
                    <span className="text-[10px] font-extrabold text-gray-400 uppercase tracking-wider">Grand Payment Total</span>
                    <span className="text-2xl font-black text-emerald-700">₹{order.grandTotal}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {localInventory.map(product => {
            const isExpanded = expandedProductId === product.id;

            return (
              <div key={product.id} className="bg-white border border-gray-200 rounded-xl shadow-xs overflow-hidden transition-all">
                <div 
                  className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer border-b border-transparent gap-2 sm:gap-0"
                  onClick={() => setExpandedProductId(isExpanded ? null : product.id)}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-bold text-gray-900 text-base">{product.name || 'Unnamed Product'}</h3>
                    <span className="text-[10px] font-bold uppercase tracking-wider bg-orange-50 border border-orange-100 text-orange-700 px-2.5 py-0.5 rounded-md w-max">
                      {product.category || 'No Category'}
                    </span>
                    
                    {/* NEW: Dynamic Tag Badge in Collapsed View */}
                    {product.containsOnionGarlic ? (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-red-50 border border-red-100 text-red-700 px-2.5 py-0.5 rounded-md w-max">
                        Contains Onion & Garlic
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-50 border border-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-md w-max">
                        No Onion/Garlic
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between w-full sm:w-auto gap-4">
                    <span className="text-xs text-gray-400">{product.variants?.length || 0} Variants</span>
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

                      {/* NEW: Onion & Garlic Checkbox Editor */}
                      <div className="md:col-span-2 mt-1 mb-2 bg-red-50/50 border border-red-100 p-3 rounded-lg flex items-center gap-3 w-fit">
                        <input 
                          type="checkbox" 
                          id={`onionGarlicCheck-${product.id}`}
                          checked={!!product.containsOnionGarlic}
                          onChange={(e) => updateProductField(product.id, 'containsOnionGarlic', e.target.checked)}
                          className="w-4 h-4 text-red-600 rounded border-gray-300 focus:ring-red-500 cursor-pointer"
                        />
                        <label htmlFor={`onionGarlicCheck-${product.id}`} className="text-sm font-bold text-gray-800 cursor-pointer select-none">
                          Product Contains <span className="text-red-700">Onion & Garlic</span>
                        </label>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-3">
                        <label className="block text-xs font-bold text-gray-800">Variants (Weights, Images, Pricing & Info)</label>
                        <button onClick={() => handleAddVariant(product.id)} className="text-xs font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer">+ Add Variant</button>
                      </div>
                      
                      <div className="space-y-4">
                        {(product.variants || []).map(variant => {
                          const variantKey = `${product.id}_${variant.variantId}`;
                          return (
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

                              <div className="p-3 bg-orange-50/40 border border-orange-100 rounded-lg">
                                <label className="block text-[9px] font-extrabold text-gray-500 uppercase tracking-wider mb-2">Variant Specific Images</label>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {(variant.images || []).map((imgUrl, idx) => (
                                    <div key={idx} className="relative w-12 h-12 bg-white border border-gray-200 rounded-md overflow-hidden group">
                                      <img src={imgUrl} alt="variant thumbnail" className="w-full h-full object-cover" />
                                      <button onClick={() => handleRemoveImage(product.id, variant.variantId, idx)} className="absolute inset-0 bg-black/50 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs font-bold">✕</button>
                                    </div>
                                  ))}
                                </div>
                                
                                <div className="flex items-center gap-3">
                                  <div className="flex-1">
                                    <input 
                                      type="file" 
                                      accept="image/*" 
                                      multiple
                                      onChange={(e) => handleImageUpload(e, product.id, variant.variantId)}
                                      disabled={uploadingKey === variantKey}
                                      className="w-full bg-white border border-gray-200 px-2.5 py-1.5 rounded-lg text-xs focus:outline-emerald-600 file:mr-2 file:py-1 file:px-2 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer disabled:opacity-50" 
                                    />
                                    {imageError[variantKey] && <span className="text-[9px] text-red-500 font-bold mt-0.5 block">{imageError[variantKey]}</span>}
                                  </div>
                                  {uploadingKey === variantKey && (
                                    <span className="text-xs text-orange-600 font-extrabold animate-pulse shrink-0">Uploading...</span>
                                  )}
                                </div>
                              </div>

                              <div className="w-full">
                                <label className="block text-[9px] font-bold text-gray-400 uppercase mb-1">Variant Description</label>
                                <textarea rows="2" placeholder="Describe this specific variant..." value={variant.description || ''} onChange={(e) => updateVariantField(product.id, variant.variantId, 'description', e.target.value)} className="w-full bg-white border border-gray-200 px-3 py-2 rounded-lg text-sm focus:outline-emerald-600"></textarea>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}