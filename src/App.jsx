import React, { useEffect, useMemo, useState } from 'react';
import { supabase, ADMIN_EMAIL, BUCKET } from './supabase';
import { ShoppingBag, Search, Plus, Pencil, Trash2, Upload, X, LogOut, FolderTree, Smartphone, Package, Settings, Eye, EyeOff, Menu, ExternalLink, RefreshCw } from 'lucide-react';

const WA_NUMBER = '916367312739';
const initialSettings = { brand_name: 'Kavi.shell', tagline: 'SPEAK WITHOUT WORDS', logo_url: null };
const blankProduct = { code: '', name: '', category_id: '', price: '599', image: null, is_active: true };

export default function App() {
  const [path,setPath] = useState(location.pathname);
  const [session,setSession] = useState(null);
  const [loading,setLoading] = useState(true);
  const [settings,setSettings] = useState(initialSettings);
  const [categories,setCategories] = useState([]);
  const [products,setProducts] = useState([]);
  const [models,setModels] = useState([]);
  const [orders,setOrders] = useState([]);
  const [tab,setTab] = useState('All');
  const [selectedSubcategory,setSelectedSubcategory] = useState('');
  const [query,setQuery] = useState('');
  const [notice,setNotice] = useState('');
  const [adminTab,setAdminTab] = useState('products');
  const [email,setEmail] = useState(ADMIN_EMAIL);
  const [password,setPassword] = useState('');
  const [productModal,setProductModal] = useState(null);
  const [productForm,setProductForm] = useState(blankProduct);
  const [categoryModal,setCategoryModal] = useState(null);
  const [categoryForm,setCategoryForm] = useState({name:'',parent_id:''});
  const [modelName,setModelName] = useState('');
  const [logoFile,setLogoFile] = useState(null);
  const [bulkFiles,setBulkFiles] = useState([]);
  const [bulkCategory,setBulkCategory] = useState('');
  const [bulkStartCode,setBulkStartCode] = useState('');
  const [selected,setSelected] = useState(null);
  const [selectedModel,setSelectedModel] = useState('');
  const [modelSearch,setModelSearch] = useState('');
  const [cart,setCart] = useState([]);
  const [checkout,setCheckout] = useState(false);
  const [customer,setCustomer] = useState({name:'',phone:'',address:''});
  const [mobileNav,setMobileNav] = useState(false);

  const navigate = (p) => { history.pushState({},'',p); setPath(p); window.scrollTo(0,0); };
  useEffect(()=>{ const pop=()=>setPath(location.pathname); addEventListener('popstate',pop); return()=>removeEventListener('popstate',pop); },[]);
  useEffect(()=>{
    if(!supabase){setLoading(false);return;}
    supabase.auth.getSession().then(({data})=>{setSession(data.session);setLoading(false);});
    const {data:{subscription}}=supabase.auth.onAuthStateChange((_e,s)=>setSession(s));
    return()=>subscription.unsubscribe();
  },[]);
  const isAdmin = session?.user?.email?.toLowerCase() === ADMIN_EMAIL.toLowerCase();

  async function loadData(){
    if(!supabase)return;
    const [c,p,s,m,o]=await Promise.all([
      supabase.from('categories').select('*').order('sort_order').order('name'),
      supabase.from('products').select('*').order('created_at',{ascending:false}),
      supabase.from('site_settings').select('*').eq('id',1).maybeSingle(),
      supabase.from('phone_models').select('*').order('brand').order('model_name'),
      isAdmin ? supabase.from('orders').select('*').order('created_at',{ascending:false}).limit(200) : Promise.resolve({data:[]})
    ]);
    for(const r of [c,p,m,o]) if(r.error) setNotice(r.error.message);
    setCategories(c.data||[]); setProducts(p.data||[]); setModels(m.data||[]); setOrders(o.data||[]);
    if(s.data)setSettings({...initialSettings,...s.data});
  }
  useEffect(()=>{if(supabase)loadData();},[isAdmin]);
  const mains = categories.filter(x=>!x.parent_id);
  const activeMain = mains.find(c=>c.name.toLowerCase()===tab.toLowerCase());
  const subcategories = activeMain ? categories.filter(c=>c.parent_id===activeMain.id) : [];
  const filtered = useMemo(()=>{
    let rows=products.filter(p=>p.is_active);
    if(tab!=='All') {
      const cat=mains.find(c=>c.name.toLowerCase()===tab.toLowerCase());
      if(cat){
        if(selectedSubcategory) rows=rows.filter(p=>p.category_id===selectedSubcategory);
        else {
          const ids=categories.filter(c=>c.parent_id===cat.id).map(c=>c.id);
          rows=rows.filter(p=>ids.includes(p.category_id));
        }
      }
    }
    if(query.trim()) rows=rows.filter(p=>(p.name||'').toLowerCase().includes(query.toLowerCase())||(p.code||'').toLowerCase().includes(query.toLowerCase()));
    return rows;
  },[products,categories,tab,selectedSubcategory,query]);
  async function uploadFile(file,prefix){
    const name=`${prefix}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,'-')}`;
    const {error}=await supabase.storage.from(BUCKET).upload(name,file,{upsert:false}); if(error)throw error;
    return supabase.storage.from(BUCKET).getPublicUrl(name).data.publicUrl;
  }
  async function signIn(e){e.preventDefault();if(email.toLowerCase()!==ADMIN_EMAIL.toLowerCase())return setNotice('This email is not authorised.');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)setNotice(error.message);else{setPassword('');navigate('/admin');}}
  async function signOut(){await supabase.auth.signOut();navigate('/');}
  function suggestNextCategoryCode(categoryId){
    if(!categoryId)return '';
    // Use the newest product code in this subcategory and continue its own prefix/number.
    const latest = products.find(p=>p.category_id===categoryId && /^(.*?)(\d+)$/.test(String(p.code||'')));
    if(latest){
      const m=String(latest.code).match(/^(.*?)(\d+)$/);
      if(m)return `${m[1]}${String(Number(m[2])+1).padStart(m[2].length,'0')}`;
    }
    const sub=categories.find(c=>c.id===categoryId);
    const main=sub&&mains.find(c=>c.id===sub.parent_id);
    const initials=value=>(value||'').trim().split(/[^a-zA-Z0-9]+/).filter(Boolean).map(part=>part[0]).join('').toUpperCase();
    const prefix=`${initials(main?.name)}${initials(sub?.name)}`;
    return prefix ? `${prefix}001` : '';
  }
  async function saveProduct(e){
    e.preventDefault();try{let image_url=productModal?.image_url||'';if(productForm.image)image_url=await uploadFile(productForm.image,'products');if(!image_url)throw new Error('Please choose a product image.');
      const payload={code:productForm.code.trim(),name:productForm.name.trim()||productForm.code.trim(),category_id:productForm.category_id,price:Number(productForm.price)||0,image_url,is_active:productForm.is_active};
      const r=productModal?.id?await supabase.from('products').update(payload).eq('id',productModal.id):await supabase.from('products').insert(payload);if(r.error)throw r.error;
      setProductModal(null);setProductForm(blankProduct);await loadData();setNotice('Product saved successfully.');
    }catch(e){setNotice(e.message||'Could not save product.');}}
  function makeCategoryPrefix(categoryId){
    const sub = categories.find(c=>c.id===categoryId);
    if(!sub)return '';
    const main = mains.find(c=>c.id===sub.parent_id);
    const initials = value => (value||'').trim().split(/[^a-zA-Z0-9]+/).filter(Boolean).map(part=>part[0]).join('').toUpperCase();
    return `${initials(main?.name)}${initials(sub.name)}`;
  }
  function suggestBulkStartCode(categoryId){ return suggestNextCategoryCode(categoryId); }
  async function bulkUpload(e){
    e.preventDefault();
    if(!bulkFiles.length||!bulkCategory)return setNotice('Choose images and a subcategory first.');
    const firstCode=bulkStartCode.trim().toUpperCase();
    const match=firstCode.match(/^(.*?)(\d+)$/);
    if(!match)return setNotice('Enter a starting product code ending with a number, e.g. MSC001.');
    const prefix=match[1], start=Number(match[2]), digits=match[2].length;
    if(!prefix||!Number.isFinite(start))return setNotice('Enter a valid starting product code.');
    let done=0;
    try{
      for(const file of bulkFiles){
        const code=`${prefix}${String(start+done).padStart(digits,'0')}`;
        if(products.some(p=>(p.code||'').toUpperCase()===code.toUpperCase()))throw new Error(`Product code ${code} already exists. Change the starting code and try again.`);
        const image_url=await uploadFile(file,'products');
        const {error}=await supabase.from('products').insert({code,name:file.name.replace(/\.[^.]+$/,''),category_id:bulkCategory,price:599,image_url,is_active:true});
        if(error)throw error;
        done++;
      }
      setBulkFiles([]);
      setBulkStartCode(suggestBulkStartCode(bulkCategory));
      const fileInput=e.currentTarget.querySelector('input[type=\"file\"]');if(fileInput)fileInput.value='';
      await loadData();
      setNotice(`${done} images uploaded with codes ${prefix}${String(start).padStart(digits,'0')} to ${prefix}${String(start+done-1).padStart(digits,'0')}.`);
    }catch(e){setNotice(`${done} uploaded; stopped: ${e.message}`);await loadData();}
  }
  async function saveCategory(e){e.preventDefault();const payload={name:categoryForm.name.trim(),parent_id:categoryForm.parent_id||null};const r=categoryModal?.id?await supabase.from('categories').update(payload).eq('id',categoryModal.id):await supabase.from('categories').insert(payload);if(r.error)setNotice(r.error.message);else{setCategoryModal(null);await loadData();setNotice('Category saved.');}}
  async function deleteCategory(c){if(!confirm(`Delete ${c.name}? Related products may also be deleted.`))return;const {error}=await supabase.from('categories').delete().eq('id',c.id);if(error)setNotice(error.message);else loadData();}
  async function saveModel(e){e.preventDefault();const [brand,...rest]=modelName.split(' ');const model_name=rest.join(' ').trim();if(!brand||!model_name)return setNotice('Enter brand and model, e.g. Apple iPhone 16 Pro.');const {error}=await supabase.from('phone_models').insert({brand,model_name,display_name:modelName.trim()});if(error)setNotice(error.message);else{setModelName('');loadData();setNotice('Phone model added.');}}
  async function deleteModel(id){if(!confirm('Delete this phone model?'))return;const {error}=await supabase.from('phone_models').delete().eq('id',id);if(error)setNotice(error.message);else loadData();}
  async function saveBrand(e){e.preventDefault();try{let logo_url=settings.logo_url;if(logoFile)logo_url=await uploadFile(logoFile,'brand');const {error}=await supabase.from('site_settings').upsert({id:1,brand_name:settings.brand_name,tagline:settings.tagline,logo_url});if(error)throw error;setLogoFile(null);await loadData();setNotice('Brand settings updated.');}catch(e){setNotice(e.message);}}
  async function deleteProduct(p){if(!confirm(`Delete ${p.code}?`))return;const {error}=await supabase.from('products').delete().eq('id',p.id);if(error)setNotice(error.message);else loadData();}
  async function toggleProduct(p){const {error}=await supabase.from('products').update({is_active:!p.is_active}).eq('id',p.id);if(error)setNotice(error.message);else loadData();}
  function addCart(){if(!selectedModel)return setNotice('Please select your phone model.');setCart(c=>[...c,{...selected,phone_model:selectedModel,qty:1,cart_id:`${selected.id}-${Date.now()}`}]);setSelected(null);setSelectedModel('');setNotice('Added to your bag.');}
  const total=cart.reduce((sum,p)=>sum+(Number(p.price)||0)*p.qty,0);
  async function placeOrder(e){e.preventDefault();if(!cart.length)return;try{const orderId=crypto.randomUUID();const orderPayload={id:orderId,customer_name:customer.name,customer_phone:customer.phone,customer_address:customer.address,items:cart.map(p=>({product_id:p.id,code:p.code,name:p.name,image_url:p.image_url,phone_model:p.phone_model,price:p.price,quantity:p.qty})),total,status:'New'};const {error}=await supabase.from('orders').insert(orderPayload);if(error)throw error;
      const lines=cart.map((p,i)=>`${i+1}. ${p.name} (${p.code})\nPhone: ${p.phone_model}\nQty: ${p.qty} | ₹${p.price}\nImage: ${p.image_url}`).join('\n\n');
      const msg=`Hello Kavi.shell! I want to place an order.\n\nOrder ID: ${orderId}\nName: ${customer.name}\nPhone: ${customer.phone}\nAddress: ${customer.address||'Not provided'}\n\n${lines}\n\nTotal: ₹${total}`;
      window.location.href=`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;setCart([]);setCheckout(false);
    }catch(e){setNotice(`Order could not be saved: ${e.message}`);}}

  if(loading)return <div className="center-screen">Loading Kavi.shell…</div>;
  if(!supabase)return <div className="setup-wrap"><div className="setup-card"><div className="monogram">K.</div><p className="eyebrow">KAVI.SHELL · SETUP</p><h1>Connect your catalogue</h1><p>Add your Supabase URL and anon key to Vercel environment variables. Run the updated <code>supabase/schema.sql</code> in Supabase SQL Editor, then redeploy.</p></div></div>;
  if(path.startsWith('/admin')&&!isAdmin)return <div className="login-wrap"><form className="login-card" onSubmit={signIn}><div className="monogram">K.</div><p className="eyebrow">KAVI.SHELL · PRIVATE</p><h1>Admin login</h1><p className="muted">Sign in to manage your store.</p><label>Email address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>{notice&&<div className="notice">{notice}</div>}<button className="primary full">Sign in</button><button type="button" className="text-button full" onClick={()=>navigate('/')}>Back to store</button></form></div>;

  if(path.startsWith('/admin')&&isAdmin)return <div className="admin-shell"><aside className={`sidebar ${mobileNav?'open':''}`}><div className="side-brand"><div className="monogram small">K.</div><b>Kavi.shell</b></div><p className="side-label">STORE MANAGEMENT</p>{[['products',ImagesIcon,'Products'],['categories',FolderTree,'Categories'],['models',Smartphone,'Phone models'],['orders',Package,'Orders'],['settings',Settings,'Brand settings']].map(([id,Icon,label])=><button key={id} className={`side-link ${adminTab===id?'active':''}`} onClick={()=>{setAdminTab(id);setMobileNav(false);}}><Icon size={17}/>{label}{id==='orders'&&orders.length>0&&<span className="count">{orders.length}</span>}</button>)}<div className="sidebar-bottom"><small>{session.user.email}</small><button className="side-link" onClick={signOut}><LogOut size={17}/>Sign out</button></div></aside>
    <main className="admin-main"><header className="admin-topbar"><button className="icon-button mobile-only" onClick={()=>setMobileNav(!mobileNav)}><Menu/></button><div><p className="eyebrow">KAVI.SHELL ADMIN</p><h1>{({products:'Products',categories:'Categories',models:'Phone models',orders:'Orders',settings:'Brand settings'})[adminTab]}</h1></div><button className="outline" onClick={()=>navigate('/')}><ExternalLink size={15}/> View store</button></header>{notice&&<div className="notice-row">{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}
    {adminTab==='products'&&<><section className="panel"><div className="panel-head"><div><h2>Product catalogue</h2><p className="muted">Manage case designs, category and price.</p></div><button className="primary" onClick={()=>{setProductForm({...blankProduct,category_id:categories.find(c=>c.parent_id)?.id||''});setProductModal({});}}><Plus size={16}/> Add product</button></div><div className="admin-product-grid">{products.map(p=><article className="admin-product" key={p.id}><img src={p.image_url} alt={p.name}/><div className="admin-product-info"><b>{displayProductName(p.name,p.code)}</b><span>₹{p.price||599}</span></div><small>{p.code} · {p.is_active?'Published':'Hidden'}</small><div className="admin-actions"><button title="Edit" onClick={()=>{setProductForm({code:p.code,name:p.name||'',category_id:p.category_id,price:String(p.price||599),image:null,is_active:p.is_active});setProductModal(p);}}><Pencil size={15}/></button><button title="Publish/hide" onClick={()=>toggleProduct(p)}>{p.is_active?<EyeOff size={15}/>:<Eye size={15}/>}</button><button title="Delete" onClick={()=>deleteProduct(p)}><Trash2 size={15}/></button></div></article>)}</div></section>
      <section className="panel bulk-panel"><h2>Bulk image upload</h2><p className="muted">Select a subcategory and multiple images. Product codes will continue automatically for that subcategory; you can edit the first code before uploading. Default price is ₹599.</p><form onSubmit={bulkUpload} className="bulk-form"><label>Category<select value={bulkCategory} onChange={e=>{setBulkCategory(e.target.value);setBulkStartCode(suggestBulkStartCode(e.target.value));}} required><option value="">Choose category</option>{categories.filter(c=>c.parent_id).map(c=><option value={c.id} key={c.id}>{mains.find(m=>m.id===c.parent_id)?.name} / {c.name}</option>)}</select></label><label>Starting product code<input value={bulkStartCode} onChange={e=>setBulkStartCode(e.target.value.toUpperCase())} placeholder="e.g. MSC001" required/></label><label>Images<input type="file" accept="image/*" multiple onChange={e=>setBulkFiles([...e.target.files])}/></label><span className="muted tiny">{bulkFiles.length} image(s) selected</span><button type="submit" className="primary"><Upload size={16}/> Upload all</button></form></section></>}
    {adminTab==='categories'&&<section className="panel"><div className="panel-head"><div><h2>Categories</h2><p className="muted">Create Men, Women, All and any subcategories.</p></div><button className="primary" onClick={()=>{setCategoryForm({name:'',parent_id:''});setCategoryModal({});}}><Plus size={16}/> Add category</button></div><div className="category-admin-list">{mains.map(c=><div className="category-admin-card" key={c.id}><div className="category-row"><b>{c.name}</b><div><button className="mini-action" onClick={()=>{setCategoryForm({name:c.name,parent_id:''});setCategoryModal(c);}}><Pencil size={14}/> Edit</button><button className="mini-action" onClick={()=>{setCategoryForm({name:'',parent_id:c.id});setCategoryModal({});}}><Plus size={14}/> Subcategory</button><button className="mini-action danger" onClick={()=>deleteCategory(c)}><Trash2 size={14}/></button></div></div>{categories.filter(s=>s.parent_id===c.id).map(s=><div className="sub-row" key={s.id}><span>↳ {s.name}</span><div><button onClick={()=>{setCategoryForm({name:s.name,parent_id:c.id});setCategoryModal(s);}}><Pencil size={14}/></button><button onClick={()=>deleteCategory(s)}><Trash2 size={14}/></button></div></div>)}</div>)}</div></section>}
    {adminTab==='models'&&<section className="panel"><h2>Phone model list</h2><p className="muted">Add brand and model separated by a space, for example Apple iPhone 16 Pro.</p><form className="inline-form" onSubmit={saveModel}><input value={modelName} onChange={e=>setModelName(e.target.value)} placeholder="Apple iPhone 16 Pro"/><button className="primary"><Plus size={16}/> Add model</button></form><div className="model-list">{models.map(m=><div key={m.id}><span><b>{m.brand}</b> {m.model_name}</span><button onClick={()=>deleteModel(m.id)}><Trash2 size={15}/></button></div>)}</div></section>}
    {adminTab==='orders'&&<section className="panel"><div className="panel-head"><div><h2>Customer orders</h2><p className="muted">Orders are saved here before WhatsApp opens.</p></div><button className="outline" onClick={loadData}><RefreshCw size={15}/> Refresh</button></div>{orders.length===0?<p className="empty-state">No orders yet.</p>:<div className="orders-list">{orders.map(o=><article key={o.id} className="order-card"><div className="order-head"><b>Order #{o.id.slice(0,8)}</b><span>{new Date(o.created_at).toLocaleString()}</span><strong>₹{o.total}</strong></div><p><b>{o.customer_name}</b> · {o.customer_phone} · {o.customer_address}</p>{(o.items||[]).map((it,i)=><div className="order-item" key={i}><img src={it.image_url} alt=""/><span>{it.name} ({it.code})<small>{it.phone_model} · Qty {it.quantity}</small></span><b>₹{it.price}</b></div>)}</article>)}</div>}</section>}
    {adminTab==='settings'&&<section className="panel settings-panel"><h2>Brand settings</h2><form onSubmit={saveBrand}><label>Brand name<input value={settings.brand_name||''} onChange={e=>setSettings({...settings,brand_name:e.target.value})}/></label><label>Tagline<input value={settings.tagline||''} onChange={e=>setSettings({...settings,tagline:e.target.value})}/></label><label>Logo image<input type="file" accept="image/*" onChange={e=>setLogoFile(e.target.files?.[0]||null)}/></label>{settings.logo_url&&<img className="logo-preview" src={settings.logo_url} alt="Current logo"/>}<button className="primary full"><Upload size={16}/> Save brand settings</button></form></section>}
    </main>
    {categoryModal!==null&&<div className="modal-backdrop" onClick={()=>setCategoryModal(null)}><form className="modal" onClick={e=>e.stopPropagation()} onSubmit={saveCategory}><button type="button" className="modal-close" onClick={()=>setCategoryModal(null)}><X/></button><h2>{categoryModal?.id?'Edit category':'Add category'}</h2><label>Name<input value={categoryForm.name} onChange={e=>setCategoryForm({...categoryForm,name:e.target.value})} required placeholder="Men / Women / All"/></label><label>Parent category<select value={categoryForm.parent_id} onChange={e=>setCategoryForm({...categoryForm,parent_id:e.target.value})}><option value="">Main category</option>{mains.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label><button className="primary full">Save category</button></form></div>}
    {productModal!==null&&<div className="modal-backdrop" onClick={()=>setProductModal(null)}><form className="modal" onClick={e=>e.stopPropagation()} onSubmit={saveProduct}><button type="button" className="modal-close" onClick={()=>setProductModal(null)}><X/></button><h2>{productModal?.id?'Edit product':'Add product'}</h2><label>Product code<input value={productForm.code} onChange={e=>setProductForm({...productForm,code:e.target.value})} required/></label><label>Display name<input value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} placeholder="Blush floral case"/></label><label>Category<select value={productForm.category_id} onChange={e=>{const category_id=e.target.value;setProductForm(f=>({...f,category_id,code:productModal?.id?f.code:suggestNextCategoryCode(category_id)}));}} required><option value="">Choose category</option>{categories.filter(c=>c.parent_id).map(c=><option key={c.id} value={c.id}>{mains.find(m=>m.id===c.parent_id)?.name} / {c.name}</option>)}</select></label><label>Price (₹)<input type="number" min="0" value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})} required/></label><label>Product image<input type="file" accept="image/*" onChange={e=>setProductForm({...productForm,image:e.target.files?.[0]||null})}/></label>{productModal?.image_url&&<img className="modal-preview" src={productModal.image_url} alt="Current product"/>}<label className="checkbox-label"><input type="checkbox" checked={productForm.is_active} onChange={e=>setProductForm({...productForm,is_active:e.target.checked})}/> Publish on website</label><button className="primary full">Save product</button></form></div>}
  </div>;

  return <div className="site"><header className="site-header"><button className="brand-lockup" onClick={()=>navigate('/')}><div className="brand-logo">{settings.logo_url?<img src={settings.logo_url} alt="logo"/>:'K.'}</div><span><b>{settings.brand_name||'Kavi.shell'}</b><small>{settings.tagline||'SPEAK WITHOUT WORDS'}</small></span></button><button className="bag-button" onClick={()=>setCheckout(true)}><ShoppingBag size={19}/> Bag <span>{cart.length}</span></button></header>
    <main><section className="hero"><p className="eyebrow">{settings.tagline||'SPEAK WITHOUT WORDS'}</p><h1>Cases that speak<br/><i>your style.</i></h1><p>Thoughtfully picked designs for the phone you carry every day.</p><button className="primary" onClick={()=>document.getElementById('shop').scrollIntoView({behavior:'smooth'})}>Explore collection <span>↓</span></button></section>
    <section className="catalogue" id="shop"><div className="section-heading"><div><p className="eyebrow">THE COLLECTION</p><h2>Find your case.</h2></div><label className="search-box"><Search size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search designs"/></label></div><div className="category-tabs"><button className={tab==='All'?'active':''} onClick={()=>{setTab('All');setSelectedSubcategory('');}}>All</button>{mains.filter(m=>m.name.toLowerCase()!=='all').map(m=><button key={m.id} className={tab===m.name?'active':''} onClick={()=>{setTab(m.name);setSelectedSubcategory('');}}>{m.name}</button>)}</div>
    {tab!=='All'&&subcategories.length>0&&<div className="subcategory-tabs"><button className={!selectedSubcategory?'active':''} onClick={()=>setSelectedSubcategory('')}>All {tab}</button>{subcategories.map(c=><button key={c.id} className={selectedSubcategory===c.id?'active':''} onClick={()=>setSelectedSubcategory(c.id)}>{c.name}</button>)}</div>}
    <div className="product-grid">{filtered.map(p=><button className="product-card" key={p.id} onClick={()=>{setSelected(p);setSelectedModel('');setModelSearch('');}}><div className="product-image"><img src={p.image_url} alt={p.name||p.code}/><span className="quick-add">Choose model <Plus size={14}/></span></div><div className="product-caption"><span>{p.code}</span><b>{displayProductName(p.name,p.code)}</b><strong>₹{p.price||599}</strong></div></button>)}</div>{filtered.length===0&&<div className="empty-state"><h3>Nothing here just yet.</h3><p>New designs are on their way.</p></div>}</section></main>
    <footer className="site-footer"><b>{settings.brand_name||'Kavi.shell'}</b><span>{settings.tagline||'SPEAK WITHOUT WORDS'}</span><small>© {new Date().getFullYear()} {settings.brand_name||'Kavi.shell'}</small></footer>
    {notice&&!selected&&!checkout&&<div className="toast" onClick={()=>setNotice('')}>{notice}<X size={14}/></div>}
    {selected&&<div className="modal-backdrop" onClick={()=>setSelected(null)}><div className="product-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setSelected(null)}><X/></button><img src={selected.image_url} alt={selected.name}/><div className="product-modal-info"><p className="eyebrow">{selected.code}</p><h2>{displayProductName(selected.name,selected.code)}</h2><strong className="price">₹{selected.price||599}</strong><label>Search phone brand & model<input type="search" value={modelSearch} onChange={e=>setModelSearch(e.target.value)} placeholder="Search iPhone, Samsung, Pixel…"/><select value={selectedModel} onChange={e=>setSelectedModel(e.target.value)}><option value="">Choose your phone model</option>{[...new Set(models.filter(m=>(m.display_name||`${m.brand} ${m.model_name}`).toLowerCase().includes(modelSearch.toLowerCase())).map(m=>m.brand))].map(brand=><optgroup label={brand} key={brand}>{models.filter(m=>m.brand===brand&&(m.display_name||`${m.brand} ${m.model_name}`).toLowerCase().includes(modelSearch.toLowerCase())).map(m=><option key={m.id} value={m.display_name||`${m.brand} ${m.model_name}`}>{m.display_name||`${m.brand} ${m.model_name}`}</option>)}</optgroup>)}</select></label><button className="primary full" onClick={addCart}>Add to bag</button></div></div></div>}
    {checkout&&<div className="modal-backdrop" onClick={()=>setCheckout(false)}><div className="checkout-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setCheckout(false)}><X/></button><p className="eyebrow">YOUR SELECTION</p><h2>Your bag</h2>{cart.length===0?<p className="muted">Your bag is empty. Pick a design to get started.</p>:<><div className="cart-items">{cart.map(p=><div className="cart-item" key={p.cart_id}><img src={p.image_url} alt=""/><div><b>{displayProductName(p.name,p.code)}</b><small>{p.code} · {p.phone_model}</small><strong>₹{p.price}</strong></div><button onClick={()=>setCart(c=>c.filter(x=>x.cart_id!==p.cart_id))}><Trash2 size={16}/></button></div>)}</div><div className="cart-total"><span>Total</span><b>₹{total}</b></div><form onSubmit={placeOrder} className="customer-form"><h3>Delivery details</h3><label>Your name<input value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} required placeholder="Full name"/></label><label>Mobile number<input type="tel" pattern="[0-9+ ]{10,15}" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})} required placeholder="Your contact number"/></label><label>Address (optional)<textarea value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})} placeholder="Delivery address"/></label><button className="primary full">Continue to WhatsApp <ExternalLink size={16}/></button><small className="muted">Your order details will be saved and WhatsApp will open with your order summary. No online payment is collected on this website.</small></form></>}</div></div>}
  </div>;
}





function displayProductName(name, fallback = '') {
  const text = String(name || fallback || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > 25
    ? text.slice(0, 25) + '...'
    : text;
}
