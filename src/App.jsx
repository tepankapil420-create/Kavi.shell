import React, { useEffect, useMemo, useState } from 'react';
import { supabase, ADMIN_EMAIL, BUCKET } from './supabase';
import { ShoppingBag, Search, Plus, Pencil, Trash2, Upload, X, LogOut, FolderTree, Smartphone, Package, Settings, Eye, EyeOff, Menu, ExternalLink, RefreshCw } from 'lucide-react';

const WA_NUMBER = '916367312739';
const initialSettings = { brand_name: 'Kavi.shell', tagline: 'SPEAK WITHOUT WORDS', logo_url: null };
const initialSlides = Array.from({length:4},(_,i)=>({id:i+1,heading:['New Offers','Fresh Arrivals','Find Your Style','Shop Kavi.shell'][i],description:'Add your offer or announcement here.',button_text:'Explore collection',image_url:'',is_active:true}));
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
  const [slides,setSlides] = useState(initialSlides);
  const [slideFiles,setSlideFiles] = useState([null,null,null,null]);
  const [activeSlideIndex,setActiveSlideIndex] = useState(0);
  const [bulkFiles,setBulkFiles] = useState([]);
  const [bulkCategory,setBulkCategory] = useState('');
  const [bulkStartCode,setBulkStartCode] = useState('');
  const [bulkPrice,setBulkPrice] = useState('599');
  const [selectedProductIds,setSelectedProductIds] = useState([]);
  const [selected,setSelected] = useState(null);
  const [previewImage,setPreviewImage] = useState(null);
  const [selectedModel,setSelectedModel] = useState('');
  const [selectedPhoneBrand,setSelectedPhoneBrand] = useState('');
  const [modelSearch,setModelSearch] = useState('');
  const [cart,setCart] = useState([]);
  const [checkout,setCheckout] = useState(false);
  const [customer,setCustomer] = useState({name:'',phone:'',address:'',pincode:''});
  const [mobileNav,setMobileNav] = useState(false);
  const [showHeaderSearch,setShowHeaderSearch] = useState(false);

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
    if(s.data){
      setSettings({...initialSettings,...s.data});
      if(Array.isArray(s.data.home_slides)){
        setSlides(initialSlides.map((fallback,i)=>({...fallback,...(s.data.home_slides[i]||{}),id:i+1})));
      }
    }
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
  const adminProductGroups = useMemo(()=>{
    const groups=[];
    for(const main of categories.filter(c=>!c.parent_id)){
      const directProducts=products.filter(p=>p.category_id===main.id);
      if(directProducts.length) groups.push({key:main.id,title:main.name,products:directProducts});
      for(const sub of categories.filter(c=>c.parent_id===main.id)){
        groups.push({
          key:sub.id,
          title:`${main.name} / ${sub.name}`,
          products:products.filter(p=>p.category_id===sub.id)
        });
      }
    }
    const knownCategoryIds=new Set(categories.map(c=>c.id));
    const uncategorized=products.filter(p=>!knownCategoryIds.has(p.category_id));
    if(uncategorized.length) groups.push({key:'uncategorized',title:'Unassigned category',products:uncategorized});
    return groups;
  },[products,categories]);
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
  async function bulkUpload(e) {
    e.preventDefault();
    const form = e.currentTarget;

    if (!bulkFiles.length || !bulkCategory) {
      setNotice('Choose images and a subcategory first.');
      return;
    }

    const enteredPrice = Number(bulkPrice);
    if (
      bulkPrice.trim() === '' ||
      !Number.isFinite(enteredPrice) ||
      enteredPrice < 0
    ) {
      setNotice('Please enter a valid product price.');
      return;
    }

    const firstCode = bulkStartCode.trim().toUpperCase();
    const match = firstCode.match(/^(.*?)(\d+)$/);
    if (!match) {
      setNotice('Enter a starting product code ending with a number, e.g. MSC001.');
      return;
    }

    const prefix = match[1];
    const start = Number(match[2]);
    const digits = match[2].length;
    if (!prefix || !Number.isFinite(start)) {
      setNotice('Enter a valid starting product code.');
      return;
    }

    let done = 0;
    try {
      for (const file of bulkFiles) {
        const code = `${prefix}${String(start + done).padStart(digits, '0')}`;
        if (products.some(p => (p.code || '').toUpperCase() === code)) {
          throw new Error(`Product code ${code} already exists. Change the starting code and try again.`);
        }

        const image_url = await uploadFile(file, 'products');
        const { error } = await supabase.from('products').insert({
          code,
          name: file.name.replace(/\.[^.]+$/, ''),
          category_id: bulkCategory,
          price: enteredPrice,
          image_url,
          is_active: true
        });
        if (error) throw error;
        done++;
      }

      setBulkFiles([]);
      setBulkStartCode(suggestBulkStartCode(bulkCategory));
      const fileInput = form?.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';
      await loadData();
      setNotice(`${done} images uploaded with codes ${prefix}${String(start).padStart(digits, '0')} to ${prefix}${String(start + done - 1).padStart(digits, '0')}.`);
    } catch (error) {
      setNotice(`${done} uploaded; stopped: ${error.message}`);
      await loadData();
    }
  }
  async function saveCategory(e){e.preventDefault();const payload={name:categoryForm.name.trim(),parent_id:categoryForm.parent_id||null};const r=categoryModal?.id?await supabase.from('categories').update(payload).eq('id',categoryModal.id):await supabase.from('categories').insert(payload);if(r.error)setNotice(r.error.message);else{setCategoryModal(null);await loadData();setNotice('Category saved.');}}
  async function deleteCategory(c){if(!confirm(`Delete ${c.name}? Related products may also be deleted.`))return;const {error}=await supabase.from('categories').delete().eq('id',c.id);if(error)setNotice(error.message);else loadData();}
  async function saveModel(e){e.preventDefault();const [brand,...rest]=modelName.split(' ');const model_name=rest.join(' ').trim();if(!brand||!model_name)return setNotice('Enter brand and model, e.g. Apple iPhone 16 Pro.');const {error}=await supabase.from('phone_models').insert({brand,model_name,display_name:modelName.trim()});if(error)setNotice(error.message);else{setModelName('');loadData();setNotice('Phone model added.');}}
  async function deleteModel(id){if(!confirm('Delete this phone model?'))return;const {error}=await supabase.from('phone_models').delete().eq('id',id);if(error)setNotice(error.message);else loadData();}
  async function saveBrand(e){e.preventDefault();try{let logo_url=settings.logo_url;if(logoFile)logo_url=await uploadFile(logoFile,'brand');const {error}=await supabase.from('site_settings').upsert({id:1,brand_name:settings.brand_name,tagline:settings.tagline,logo_url});if(error)throw error;setLogoFile(null);await loadData();setNotice('Brand settings updated.');}catch(e){setNotice(e.message);}}
  async function saveHomeSlides(e){
    e.preventDefault();
    try{
      const updated=[];
      for(let i=0;i<4;i++){
        const slide=slides[i]||initialSlides[i];
        let image_url=slide.image_url||'';
        if(slideFiles[i]) image_url=await uploadFile(slideFiles[i],'home-slides');
        updated.push({...slide,id:i+1,image_url});
      }
      const {error}=await supabase.from('site_settings').upsert({
        id:1,brand_name:settings.brand_name,tagline:settings.tagline,
        logo_url:settings.logo_url,home_slides:updated
      });
      if(error)throw error;
      setSlides(updated);setSlideFiles([null,null,null,null]);
      setNotice('Home slides updated successfully.');
    }catch(error){setNotice(error.message||'Could not save home slides.');}
  }
  function getProductStoragePath(imageUrl){
    if(!imageUrl || !BUCKET)return null;
    try{
      const pathname=new URL(imageUrl).pathname;
      // Supports Supabase public, signed, and authenticated object URLs.
      const match=pathname.match(/\/storage\/v1\/object\/(?:public|sign|authenticated)\/([^/]+)\/(.+)$/);
      if(!match)return null;
      const bucketName=decodeURIComponent(match[1]);
      if(bucketName!==BUCKET)return null;
      return decodeURIComponent(match[2]);
    }catch{
      return null;
    }
  }

  async function deleteProducts(rows){
    if(!rows.length || !supabase)return;

    const ids=rows.map(p=>p.id).filter(Boolean);
    if(!ids.length){
      setNotice('No valid products were selected.');
      return;
    }

    // First remove the product records. Storage cleanup is attempted only
    // after the database confirms the deletion.
    const {error:databaseError}=await supabase.from('products').delete().in('id',ids);
    if(databaseError){
      setNotice(`Products could not be deleted: ${databaseError.message}`);
      return;
    }

    const extractedPaths=rows.map(p=>getProductStoragePath(p.image_url));
    const imagePaths=[...new Set(extractedPaths.filter(Boolean))];
    const unmatchedImages=extractedPaths.filter(path=>!path).length;
    let warnings=[];

    if(imagePaths.length){
      const {error:storageError}=await supabase.storage.from(BUCKET).remove(imagePaths);
      if(storageError){
        warnings.push(`Storage image deletion failed: ${storageError.message}`);
      }
    }
    if(unmatchedImages){
      warnings.push(`${unmatchedImages} image URL(s) could not be matched to this Supabase bucket, so those files were not removed.`);
    }

    setSelectedProductIds([]);
    await loadData();

    if(warnings.length){
      setNotice(`${ids.length} product record(s) deleted. ${warnings.join(' ')}`);
    }else{
      setNotice(`${ids.length} product(s) and their Storage image(s) deleted successfully.`);
    }
  }

  async function deleteProduct(p){
    if(!confirm(`Delete ${p.code} and its image? This cannot be undone.`))return;
    await deleteProducts([p]);
  }

  async function deleteSelectedProducts(){
    const rows=products.filter(p=>selectedProductIds.includes(p.id));
    if(!rows.length){
      setNotice('Please select at least one product.');
      return;
    }
    if(!confirm(`Are you sure you want to delete ${rows.length} selected product(s) and their images? This cannot be undone.`))return;
    await deleteProducts(rows);
  }
  async function toggleProduct(p){const {error}=await supabase.from('products').update({is_active:!p.is_active}).eq('id',p.id);if(error)setNotice(error.message);else loadData();}
  function addCart(){if(!selectedModel)return setNotice('Please select your phone model.');setCart(c=>[...c,{...selected,phone_model:selectedModel,qty:1,cart_id:`${selected.id}-${Date.now()}`}]);setSelected(null);setSelectedModel('');setNotice('Added to your bag.');}
  const total=cart.reduce((sum,p)=>sum+(Number(p.price)||0)*p.qty,0);
  const phoneModelBrands=[...new Set(models.map(m=>m.brand).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  const filteredPhoneModels=models.filter(m=>(!selectedPhoneBrand||m.brand===selectedPhoneBrand)&&(m.display_name||`${m.brand} ${m.model_name}`).toLowerCase().includes(modelSearch.trim().toLowerCase()));
  const visibleSlides=slides.filter(slide=>slide.is_active&&slide.image_url);
  useEffect(()=>{
    if(visibleSlides.length<2)return;
    const timer=setInterval(()=>setActiveSlideIndex(index=>(index+1)%visibleSlides.length),3000);
    return()=>clearInterval(timer);
  },[visibleSlides.length]);
  useEffect(()=>{if(activeSlideIndex>=visibleSlides.length)setActiveSlideIndex(0);},[activeSlideIndex,visibleSlides.length]);
  function openSlideCategory(categoryId){
    const category=categories.find(c=>c.id===categoryId);
    if(!category){
      document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});
      return;
    }
    if(category.parent_id){
      const parent=mains.find(c=>c.id===category.parent_id);
      if(parent){setTab(parent.name);setSelectedSubcategory(category.id);}
    }else{
      setTab(category.name.toLowerCase()==='all'?'All':category.name);
      setSelectedSubcategory('');
    }
    setQuery('');
    document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});
  }

  async function placeOrder(e){
    e.preventDefault();
    if(!cart.length)return;
    const cleanPincode=customer.pincode.trim();
    if(!customer.address.trim())return setNotice('Please enter your complete delivery address.');
    if(!/^[0-9]{6}$/.test(cleanPincode))return setNotice('Please enter a valid 6-digit PIN code.');
    try{
      const orderId=crypto.randomUUID();
      // Keep address and PIN code in the existing database column so no SQL schema change is needed.
      const savedAddress=`${customer.address.trim()}\nPincode: ${cleanPincode}`;
      const orderPayload={id:orderId,customer_name:customer.name,customer_phone:customer.phone,customer_address:savedAddress,items:cart.map(p=>({product_id:p.id,code:p.code,name:p.name,image_url:p.image_url,phone_model:p.phone_model,price:p.price,quantity:p.qty})),total,status:'New'};
      const {error}=await supabase.from('orders').insert(orderPayload);
      if(error)throw error;
      const lines=cart.map((p,i)=>`${i+1}. ${p.name} (${p.code})\nPhone: ${p.phone_model}\nQty: ${p.qty} | ₹${p.price}\nImage: ${p.image_url}`).join('\n\n');
      const msg=`Hello Kavi.shell! I want to place an order.\n\nOrder ID: ${orderId}\nName: ${customer.name}\nPhone: ${customer.phone}\nAddress: ${customer.address.trim()}\nPincode: ${cleanPincode}\n\n${lines}\n\nTotal: ₹${total}`;
      window.location.href=`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`;
      setCart([]);setCheckout(false);
    }catch(e){setNotice(`Order could not be saved: ${e.message}`);}
  }

  if(loading)return <div className="center-screen">Loading Kavi.shell…</div>;
  if(!supabase)return <div className="setup-wrap"><div className="setup-card"><div className="monogram">K.</div><p className="eyebrow">KAVI.SHELL · SETUP</p><h1>Connect your catalogue</h1><p>Add your Supabase URL and anon key to Vercel environment variables. Run the updated <code>supabase/schema.sql</code> in Supabase SQL Editor, then redeploy.</p></div></div>;
  if(path.startsWith('/admin')&&!isAdmin)return <div className="login-wrap"><form className="login-card" onSubmit={signIn}><div className="monogram">K.</div><p className="eyebrow">KAVI.SHELL · PRIVATE</p><h1>Admin login</h1><p className="muted">Sign in to manage your store.</p><label>Email address</label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} required/><label>Password</label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} required/>{notice&&<div className="notice">{notice}</div>}<button className="primary full">Sign in</button><button type="button" className="text-button full" onClick={()=>navigate('/')}>Back to store</button></form></div>;

  if(path.startsWith('/admin')&&isAdmin)return <div className="admin-shell"><aside className={`sidebar ${mobileNav?'open':''}`}><div className="side-brand"><div className="monogram small">K.</div><b>Kavi.shell</b></div><p className="side-label">STORE MANAGEMENT</p>{[['products',ImagesIcon,'Products'],['categories',FolderTree,'Categories'],['models',Smartphone,'Phone models'],['orders',Package,'Orders'],['slides',ImagesIcon,'Home Slides'],['settings',Settings,'Brand settings']].map(([id,Icon,label])=><button key={id} className={`side-link ${adminTab===id?'active':''}`} onClick={()=>{setAdminTab(id);setMobileNav(false);}}><Icon size={17}/>{label}{id==='orders'&&orders.length>0&&<span className="count">{orders.length}</span>}</button>)}<div className="sidebar-bottom"><small>{session.user.email}</small><button className="side-link" onClick={signOut}><LogOut size={17}/>Sign out</button></div></aside>
    <main className="admin-main"><header className="admin-topbar"><button className="icon-button mobile-only" onClick={()=>setMobileNav(!mobileNav)}><Menu/></button><div><p className="eyebrow">KAVI.SHELL ADMIN</p><h1>{({products:'Products',categories:'Categories',models:'Phone models',orders:'Orders',slides:'Home Slides',settings:'Brand settings'})[adminTab]}</h1></div><button className="outline" onClick={()=>navigate('/')}><ExternalLink size={15}/> View store</button></header>{notice&&<div className="notice-row">{notice}<button onClick={()=>setNotice('')}><X size={15}/></button></div>}
    {adminTab==='products'&&<><section className="panel"><div className="panel-head"><div><h2>Product catalogue</h2><p className="muted">Manage case designs, category and price.</p></div><button className="primary" onClick={()=>{setProductForm({...blankProduct,category_id:categories.find(c=>c.parent_id)?.id||''});setProductModal({});}}><Plus size={16}/> Add product</button></div>
      <section className="panel bulk-panel" style={{marginTop:18,marginBottom:22}}><h2>Bulk image upload</h2><p className="muted">Select a subcategory and multiple images. Product codes will continue automatically for that subcategory; you can edit the first code and set the price before uploading.</p><form onSubmit={bulkUpload} className="bulk-form"><label>Category<select value={bulkCategory} onChange={e=>{setBulkCategory(e.target.value);setBulkStartCode(suggestBulkStartCode(e.target.value));}} required><option value="">Choose category</option>{categories.filter(c=>c.parent_id).map(c=><option value={c.id} key={c.id}>{mains.find(m=>m.id===c.parent_id)?.name} / {c.name}</option>)}</select></label><label>Starting product code<input value={bulkStartCode} onChange={e=>setBulkStartCode(e.target.value.toUpperCase())} placeholder="e.g. MSC001" required/></label><label>Product price (₹)<input type="number" min="0" step="0.01" value={bulkPrice} onChange={e=>setBulkPrice(e.target.value)} placeholder="Enter product price" required/></label><label>Images<input type="file" accept="image/*" multiple onChange={e=>setBulkFiles([...e.target.files])} required/></label><span className="muted tiny">{bulkFiles.length} image(s) selected</span><button type="submit" className="primary"><Upload size={16}/> Upload all</button></form></section>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap',margin:'18px 0',padding:'14px',border:'1px solid #d8d2c8',borderRadius:10,background:'#fff'}}>
        <button type="button" onClick={()=>setSelectedProductIds(selectedProductIds.length===products.length?[]:products.map(p=>p.id))} style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 14px',border:'1px solid #222',borderRadius:8,background:'#fff',color:'#222',fontWeight:600,cursor:'pointer',visibility:'visible'}}>
          {products.length>0 && selectedProductIds.length===products.length ? 'Deselect All' : 'Select All Products'}
        </button>
        <button type="button" disabled={selectedProductIds.length===0} onClick={deleteSelectedProducts} style={{display:'inline-flex',alignItems:'center',gap:8,padding:'10px 14px',border:'1px solid #b42318',borderRadius:8,background:selectedProductIds.length?'#b42318':'#f3d6d4',color:'#fff',fontWeight:700,cursor:selectedProductIds.length?'pointer':'not-allowed',opacity:1,visibility:'visible'}}>
          <Trash2 size={16}/> Delete Selected ({selectedProductIds.length})
        </button>
      </div>
      <div className="admin-category-groups">{adminProductGroups.map(group=><section key={group.key} className="admin-category-group" style={{marginTop:24,paddingTop:18,borderTop:'1px solid #e5e0d8'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,marginBottom:14,flexWrap:'wrap'}}>
          <h3 style={{margin:0,fontSize:17,fontWeight:700}}>{group.title}</h3>
          <small className="muted">{group.products.length} image(s)</small>
        </div>
        {group.products.length===0?<p className="empty-state">No images in this category yet.</p>:<div className="admin-product-grid">{group.products.map(p=><article className="admin-product" key={p.id}>
        <button type="button" onClick={()=>setSelectedProductIds(current=>current.includes(p.id)?current.filter(id=>id!==p.id):[...current,p.id])} style={{display:'inline-flex',alignItems:'center',gap:7,margin:'8px',padding:'7px 11px',border:selectedProductIds.includes(p.id)?'2px solid #166534':'1px solid #777',borderRadius:7,background:selectedProductIds.includes(p.id)?'#dcfce7':'#fff',color:'#222',fontWeight:700,cursor:'pointer',visibility:'visible',opacity:1}}>
          <span aria-hidden="true" style={{display:'inline-block',width:16,height:16,lineHeight:'14px',textAlign:'center',border:'1px solid #555',borderRadius:3,background:'#fff',color:'#166534'}}>{selectedProductIds.includes(p.id)?'✓':''}</span>
          {selectedProductIds.includes(p.id)?'Selected':'Select'}
        </button>
        <img src={p.image_url} alt={p.name}/><div className="admin-product-info"><b>{displayProductName(p.name,p.code)}</b><span>₹{p.price||599}</span></div><small>{p.code} · {p.is_active?'Published':'Hidden'}</small><div className="admin-actions"><button title="Edit" onClick={()=>{setProductForm({code:p.code,name:p.name||'',category_id:p.category_id,price:String(p.price||599),image:null,is_active:p.is_active});setProductModal(p);}}><Pencil size={15}/></button><button title="Publish/hide" onClick={()=>toggleProduct(p)}>{p.is_active?<EyeOff size={15}/>:<Eye size={15}/>}</button><button title="Delete" onClick={()=>deleteProduct(p)}><Trash2 size={15}/></button></div></article>)}</div>}
      </section>)}</div></section></>}
    {adminTab==='categories'&&<section className="panel"><div className="panel-head"><div><h2>Categories</h2><p className="muted">Create Men, Women, All and any subcategories.</p></div><button className="primary" onClick={()=>{setCategoryForm({name:'',parent_id:''});setCategoryModal({});}}><Plus size={16}/> Add category</button></div><div className="category-admin-list">{mains.map(c=><div className="category-admin-card" key={c.id}><div className="category-row"><b>{c.name}</b><div><button className="mini-action" onClick={()=>{setCategoryForm({name:c.name,parent_id:''});setCategoryModal(c);}}><Pencil size={14}/> Edit</button><button className="mini-action" onClick={()=>{setCategoryForm({name:'',parent_id:c.id});setCategoryModal({});}}><Plus size={14}/> Subcategory</button><button className="mini-action danger" onClick={()=>deleteCategory(c)}><Trash2 size={14}/></button></div></div>{categories.filter(s=>s.parent_id===c.id).map(s=><div className="sub-row" key={s.id}><span>↳ {s.name}</span><div><button onClick={()=>{setCategoryForm({name:s.name,parent_id:c.id});setCategoryModal(s);}}><Pencil size={14}/></button><button onClick={()=>deleteCategory(s)}><Trash2 size={14}/></button></div></div>)}</div>)}</div></section>}
    {adminTab==='models'&&<section className="panel"><h2>Phone model list</h2><p className="muted">Add brand and model separated by a space, for example Apple iPhone 16 Pro.</p><form className="inline-form" onSubmit={saveModel}><input value={modelName} onChange={e=>setModelName(e.target.value)} placeholder="Apple iPhone 16 Pro"/><button className="primary"><Plus size={16}/> Add model</button></form><div className="model-list">{models.map(m=><div key={m.id}><span><b>{m.brand}</b> {m.model_name}</span><button onClick={()=>deleteModel(m.id)}><Trash2 size={15}/></button></div>)}</div></section>}
    {adminTab==='orders'&&<section className="panel"><div className="panel-head"><div><h2>Customer orders</h2><p className="muted">Orders are saved here before WhatsApp opens.</p></div><button className="outline" onClick={loadData}><RefreshCw size={15}/> Refresh</button></div>{orders.length===0?<p className="empty-state">No orders yet.</p>:<div className="orders-list">{orders.map(o=><article key={o.id} className="order-card"><div className="order-head"><b>Order #{o.id.slice(0,8)}</b><span>{new Date(o.created_at).toLocaleString()}</span><strong>₹{o.total}</strong></div><p><b>{o.customer_name}</b> · {o.customer_phone} · {o.customer_address}</p>{(o.items||[]).map((it,i)=><div className="order-item" key={i}><img src={it.image_url} alt=""/><span>{it.name} ({it.code})<small>{it.phone_model} · Qty {it.quantity}</small></span><b>₹{it.price}</b></div>)}</article>)}</div>}</section>}
    {adminTab==='slides'&&<section className="panel">
      <div className="panel-head"><div><h2>Home page slides</h2><p className="muted">Manage the 4 promotional banners shown on the store home page. Slides change automatically every 3 seconds.</p></div></div>
      <form onSubmit={saveHomeSlides} className="settings-panel">
        {slides.map((slide,i)=><section key={i} style={{border:'1px solid #e5e0d8',borderRadius:12,padding:16,marginBottom:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,marginBottom:12}}><h3 style={{margin:0}}>Slide {i+1}</h3><label style={{display:'flex',alignItems:'center',gap:8}}><input type="checkbox" checked={!!slide.is_active} onChange={e=>setSlides(current=>current.map((x,j)=>j===i?{...x,is_active:e.target.checked}:x))}/> Show slide</label></div>
          {slide.image_url&&!slideFiles[i]&&<img src={slide.image_url} alt={`Slide ${i+1}`} style={{width:'100%',maxHeight:180,objectFit:'cover',borderRadius:8,marginBottom:12}}/>}
          <label>Banner image<input type="file" accept="image/*" onChange={e=>setSlideFiles(current=>current.map((x,j)=>j===i?(e.target.files?.[0]||null):x))}/></label>
          {slideFiles[i]&&<small className="muted">Selected: {slideFiles[i].name}</small>}
          <label>Heading<input value={slide.heading||''} onChange={e=>setSlides(current=>current.map((x,j)=>j===i?{...x,heading:e.target.value}:x))} placeholder="e.g. Big festive sale"/></label>
          <label>Description<textarea value={slide.description||''} onChange={e=>setSlides(current=>current.map((x,j)=>j===i?{...x,description:e.target.value}:x))} placeholder="Write offer details"/></label>
          <label>Button text<input value={slide.button_text||''} onChange={e=>setSlides(current=>current.map((x,j)=>j===i?{...x,button_text:e.target.value}:x))} placeholder="e.g. Shop Doom collection"/></label>
          <label>Button link / Destination category<select value={slide.category_id||''} onChange={e=>setSlides(current=>current.map((x,j)=>j===i?{...x,category_id:e.target.value}:x))}><option value="">All products / Explore collection</option>{mains.map(main=><optgroup key={main.id} label={main.name}><option value={main.id}>{main.name} (main category)</option>{categories.filter(c=>c.parent_id===main.id).map(sub=><option key={sub.id} value={sub.id}>{sub.name}</option>)}</optgroup>)}</select></label>
          <small className="muted">Button click karne par customer selected category ke products par jayega.</small>
        </section>)}
        <button className="primary full" type="submit"><Upload size={16}/> Save all 4 slides</button>
      </form>
    </section>}
    {adminTab==='settings'&&<section className="panel settings-panel"><h2>Brand settings</h2><form onSubmit={saveBrand}><label>Brand name<input value={settings.brand_name||''} onChange={e=>setSettings({...settings,brand_name:e.target.value})}/></label><label>Tagline<input value={settings.tagline||''} onChange={e=>setSettings({...settings,tagline:e.target.value})}/></label><label>Logo image<input type="file" accept="image/*" onChange={e=>setLogoFile(e.target.files?.[0]||null)}/></label>{settings.logo_url&&<img className="logo-preview" src={settings.logo_url} alt="Current logo"/>}<button className="primary full"><Upload size={16}/> Save brand settings</button></form></section>}
    </main>
    {categoryModal!==null&&<div className="modal-backdrop" onClick={()=>setCategoryModal(null)}><form className="modal" onClick={e=>e.stopPropagation()} onSubmit={saveCategory}><button type="button" className="modal-close" onClick={()=>setCategoryModal(null)}><X/></button><h2>{categoryModal?.id?'Edit category':'Add category'}</h2><label>Name<input value={categoryForm.name} onChange={e=>setCategoryForm({...categoryForm,name:e.target.value})} required placeholder="Men / Women / All"/></label><label>Parent category<select value={categoryForm.parent_id} onChange={e=>setCategoryForm({...categoryForm,parent_id:e.target.value})}><option value="">Main category</option>{mains.map(m=><option value={m.id} key={m.id}>{m.name}</option>)}</select></label><button className="primary full">Save category</button></form></div>}
    {productModal!==null&&<div className="modal-backdrop" onClick={()=>setProductModal(null)}><form className="modal" onClick={e=>e.stopPropagation()} onSubmit={saveProduct}><button type="button" className="modal-close" onClick={()=>setProductModal(null)}><X/></button><h2>{productModal?.id?'Edit product':'Add product'}</h2><label>Product code<input value={productForm.code} onChange={e=>setProductForm({...productForm,code:e.target.value})} required/></label><label>Display name<input value={productForm.name} onChange={e=>setProductForm({...productForm,name:e.target.value})} placeholder="Blush floral case"/></label><label>Category<select value={productForm.category_id} onChange={e=>{const category_id=e.target.value;setProductForm(f=>({...f,category_id,code:productModal?.id?f.code:suggestNextCategoryCode(category_id)}));}} required><option value="">Choose category</option>{categories.filter(c=>c.parent_id).map(c=><option key={c.id} value={c.id}>{mains.find(m=>m.id===c.parent_id)?.name} / {c.name}</option>)}</select></label><label>Price (₹)<input type="number" min="0" value={productForm.price} onChange={e=>setProductForm({...productForm,price:e.target.value})} required/></label><label>Product image<input type="file" accept="image/*" onChange={e=>setProductForm({...productForm,image:e.target.files?.[0]||null})}/></label>{productModal?.image_url&&<img className="modal-preview" src={productModal.image_url} alt="Current product"/>}<label className="checkbox-label"><input type="checkbox" checked={productForm.is_active} onChange={e=>setProductForm({...productForm,is_active:e.target.checked})}/> Publish on website</label><button className="primary full">Save product</button></form></div>}
  </div>;

  return <div className="site"><style>{`
      .catalogue{width:min(1200px,calc(100% - 40px));margin:0 auto;padding:36px 0 64px}
      .product-grid{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:34px 28px!important;align-items:start!important;width:100%!important}
      .product-card{display:flex!important;flex-direction:column!important;min-width:0!important;width:100%!important;float:none!important;margin:0!important}
      .product-image{width:100%!important;overflow:hidden!important}
      .product-image img{display:block!important;width:100%!important;height:360px!important;object-fit:contain!important;object-position:center!important}
      .product-caption{display:flex!important;flex-direction:column!important;align-items:flex-start!important;gap:5px!important;padding:12px 0 0!important;width:100%!important}
      .product-caption .quick-add{display:inline-flex!important;visibility:visible!important;opacity:1!important;position:static!important;align-self:flex-start!important;align-items:center!important;justify-content:center!important;gap:7px!important;margin:8px 0 0!important;padding:10px 18px!important;min-height:40px!important;border:1px solid #5a382f!important;border-radius:999px!important;background:#4a2b22!important;color:#fff!important;font:inherit!important;font-size:13px!important;font-weight:650!important;cursor:pointer!important;transform:none!important}
      .product-caption .quick-add:hover{background:#684338!important}
      @media(max-width:900px){.product-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:28px 20px!important}.product-image img{height:300px!important}}
      @media(max-width:640px){.catalogue{width:calc(100% - 28px)!important;padding:24px 0 44px!important}.product-grid{grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:24px 14px!important}.product-image img{height:230px!important}.product-caption{padding-top:9px!important}.product-caption .quick-add{width:100%!important;align-self:stretch!important;min-height:38px!important;padding:8px 10px!important;font-size:12px!important}}
    `}</style><header className="site-header" style={{position:'sticky',top:0,zIndex:50,background:'#fff',boxShadow:'0 2px 12px rgba(0,0,0,.06)'}}><button className="brand-lockup" onClick={()=>navigate('/')}><div className="brand-logo">{settings.logo_url?<img src={settings.logo_url} alt="logo"/>:'K.'}</div><span><b>{settings.brand_name||'Kavi.shell'}</b><small>{settings.tagline||'SPEAK WITHOUT WORDS'}</small></span></button><div style={{display:'flex',alignItems:'center',gap:10}}>{showHeaderSearch&&<input autoFocus type="search" value={query} onChange={e=>setQuery(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')document.getElementById('shop')?.scrollIntoView({behavior:'smooth'});}} placeholder="Search designs" aria-label="Search designs" style={{width:'min(38vw,220px)',minWidth:110,padding:'9px 11px',border:'1px solid #d8d2c8',borderRadius:8,background:'#fff'}}/>}<button type="button" aria-label="Search products" title="Search products" onClick={()=>setShowHeaderSearch(v=>!v)} style={{width:42,height:42,display:"inline-flex",alignItems:"center",justifyContent:"center",border:"1px solid #5a382f",borderRadius:999,background:"#fff",color:"#5a382f",cursor:"pointer",padding:0,flexShrink:0}}><Search size={19}/></button><button className="bag-button" onClick={()=>setCheckout(true)}><ShoppingBag size={19}/> Bag <span>{cart.length}</span></button></div></header>
    <main>    <section className="hero"><p className="eyebrow">{settings.tagline||'SPEAK WITHOUT WORDS'}</p><h1>Cases that speak<br/><i>your style.</i></h1><p>Thoughtfully picked designs for the phone you carry every day.</p><button className="primary" onClick={()=>document.getElementById('shop').scrollIntoView({behavior:'smooth'})}>Explore collection <span>↓</span></button></section>
{visibleSlides.length>0&&<section aria-label="Promotions" style={{position:'relative',margin:'18px auto 0',width:'min(1200px,calc(100% - 32px))',height:'clamp(220px,38vw,440px)',overflow:'hidden',borderRadius:18,background:'#252525',color:'#fff'}}>
      {visibleSlides.map((slide,i)=><div key={slide.id||i} style={{position:'absolute',inset:0,opacity:i===activeSlideIndex?1:0,transition:'opacity .55s ease',pointerEvents:i===activeSlideIndex?'auto':'none',backgroundImage:`linear-gradient(90deg,rgba(0,0,0,.72),rgba(0,0,0,.12)),url("${slide.image_url}")`,backgroundSize:'cover',backgroundPosition:'center',display:'flex',alignItems:'center',padding:'clamp(22px,6vw,64px)'}}>
        <div style={{maxWidth:520}}><p style={{textTransform:'uppercase',letterSpacing:2,fontSize:12}}>KAVI.SHELL · OFFERS</p><h2 style={{fontSize:'clamp(28px,5vw,54px)',lineHeight:1.05,margin:'12px 0'}}>{slide.heading}</h2><p style={{fontSize:'clamp(14px,2vw,18px)',lineHeight:1.5}}>{slide.description}</p><button className="primary" onClick={()=>openSlideCategory(slide.category_id)}>{slide.button_text||'Explore collection'} <span>→</span></button></div>
      </div>)}
      {visibleSlides.length>1&&<><button type="button" aria-label="Previous slide" onClick={()=>setActiveSlideIndex(i=>(i-1+visibleSlides.length)%visibleSlides.length)} style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',zIndex:2,border:0,borderRadius:'50%',width:38,height:38,background:'rgba(0,0,0,.45)',color:'#fff',fontSize:24,cursor:'pointer'}}>‹</button><button type="button" aria-label="Next slide" onClick={()=>setActiveSlideIndex(i=>(i+1)%visibleSlides.length)} style={{position:'absolute',right:12,top:'50%',transform:'translateY(-50%)',zIndex:2,border:0,borderRadius:'50%',width:38,height:38,background:'rgba(0,0,0,.45)',color:'#fff',fontSize:24,cursor:'pointer'}}>›</button><div style={{position:'absolute',bottom:14,left:0,right:0,display:'flex',justifyContent:'center',gap:8,zIndex:3}}>{visibleSlides.map((_,i)=><button key={i} type="button" aria-label={`Go to slide ${i+1}`} onClick={()=>setActiveSlideIndex(i)} style={{width:i===activeSlideIndex?22:8,height:8,border:0,borderRadius:10,background:i===activeSlideIndex?'#fff':'rgba(255,255,255,.55)',cursor:'pointer',padding:0}}/>)}</div></>}
    </section>}
    <section className="catalogue" id="shop"><div className="section-heading"><div><p className="eyebrow">THE COLLECTION</p><h2>Find your case.</h2></div></div><div className="category-tabs"><button className={tab==='All'?'active':''} onClick={()=>{setTab('All');setSelectedSubcategory('');}}>All</button>{mains.filter(m=>m.name.toLowerCase()!=='all').map(m=><button key={m.id} className={tab===m.name?'active':''} onClick={()=>{setTab(m.name);setSelectedSubcategory('');}}>{m.name}</button>)}</div>
    {tab!=='All'&&subcategories.length>0&&<div className="subcategory-tabs"><button className={!selectedSubcategory?'active':''} onClick={()=>setSelectedSubcategory('')}>All {tab}</button>{subcategories.map(c=><button key={c.id} className={selectedSubcategory===c.id?'active':''} onClick={()=>setSelectedSubcategory(c.id)}>{c.name}</button>)}</div>}
    <div className="product-grid">{filtered.map(p=><article className="product-card" key={p.id} style={{display:'block'}}><button type="button" className="product-image" onClick={()=>setPreviewImage(p.image_url)} aria-label={`View ${p.name||p.code} image full size`} style={{display:'block',position:'relative',width:'100%',padding:0,border:0,background:'transparent',cursor:'zoom-in'}}><img src={p.image_url} alt={p.name||p.code}/></button><div className="product-caption"><span>{p.code}</span><b>{displayProductName(p.name,p.code)}</b><strong>₹{p.price||599}</strong><button type="button" className="quick-add" onClick={()=>{setSelected(p);setSelectedModel('');setSelectedPhoneBrand('');setModelSearch('');}}>Add to bag <Plus size={14}/></button></div></article>)}</div>{filtered.length===0&&<div className="empty-state"><h3>Nothing here just yet.</h3><p>New designs are on their way.</p></div>}</section></main>
    <footer className="site-footer"><b>{settings.brand_name||'Kavi.shell'}</b><span>{settings.tagline||'SPEAK WITHOUT WORDS'}</span><small>© {new Date().getFullYear()} {settings.brand_name||'Kavi.shell'}</small></footer>
    {notice&&!selected&&!checkout&&<div className="toast" onClick={()=>setNotice('')}>{notice}<X size={14}/></div>}
    {selected&&<div className="modal-backdrop device-picker-backdrop" onClick={()=>setSelected(null)}><style>{`
      .device-picker-backdrop{z-index:1000;display:flex;align-items:center;justify-content:center;padding:18px;backdrop-filter:blur(5px)}
      .product-modal{position:relative;width:min(900px,94vw);max-height:90vh;overflow:hidden;display:grid;grid-template-columns:minmax(0,1fr) minmax(320px,.9fr);background:#fffaf8;border-radius:22px;box-shadow:0 24px 80px rgba(0,0,0,.28)}
      .product-modal>img{width:100%;height:100%;max-height:680px;object-fit:contain;background:#f5eeea}
      .product-modal-info{padding:38px 32px;overflow:hidden;display:flex;flex-direction:column;min-width:0}
      .product-modal-info h2{font-size:28px;margin:8px 0;line-height:1.15}
      .phone-model-fields{display:flex;flex-direction:column;gap:13px;width:100%;margin:20px 0;min-height:0;flex:1}
      .phone-model-fields label{display:block;font-size:13px;font-weight:650;color:#5a382f;margin:0 0 7px}
      .phone-model-fields input,.phone-model-fields select{display:block;box-sizing:border-box;width:100%;min-height:48px;padding:12px 14px;border:1px solid #ddcec8;border-radius:12px;background:#fff;color:#3b241e;font:inherit;font-size:15px;outline:none}
      .phone-model-fields input:focus,.phone-model-fields select:focus{border-color:#80584c;box-shadow:0 0 0 3px rgba(128,88,76,.12)}
      .device-model-list{border:1px solid #eadfda;border-radius:13px;overflow-y:auto;max-height:260px;background:#fff;min-height:90px}
      .device-model-option{display:block;width:100%;text-align:left;padding:15px 16px;border:0;border-bottom:1px solid #f0e9e5;background:#fff;color:#33231f;font:inherit;font-size:15px;cursor:pointer}
      .device-model-option:last-child{border-bottom:0}.device-model-option:active,.device-model-option.active{background:#f6ece7;color:#5c3329;font-weight:700}
      .device-model-empty{padding:18px;color:#8b7770;font-size:14px}
      .device-model-empty:empty{display:none}
      .product-image img{display:block;width:100%;height:auto}
      .product-caption .quick-add{display:inline-flex;align-items:center;justify-content:center;gap:7px;margin-top:9px;padding:9px 13px;border:1px solid #5a382f;border-radius:999px;background:#4a2b22;color:#fff;font:inherit;font-size:13px;font-weight:650;cursor:pointer}
      .image-preview-backdrop{position:fixed;inset:0;z-index:99999;background:rgba(15,12,11,.88);display:flex;align-items:center;justify-content:center;padding:24px}
      .image-preview-backdrop img{display:block;max-width:min(96vw,1400px);max-height:92vh;width:auto;height:auto;object-fit:contain;border-radius:8px;cursor:zoom-out}
      .image-preview-close{position:absolute;top:18px;right:18px;width:44px;height:44px;border:0;border-radius:50%;background:#fff;color:#39251f;display:grid;place-items:center;cursor:pointer}
      .modal-close{position:absolute;right:16px;top:16px;z-index:5;border:0;border-radius:50%;width:40px;height:40px;background:#f4eeeb;color:#5a382f;display:grid;place-items:center;cursor:pointer}
      @media(max-width:640px){.device-picker-backdrop{padding:0!important;align-items:center!important;justify-content:center!important;background:rgba(0,0,0,.58)!important}.product-modal{width:calc(100vw - 28px)!important;max-width:460px!important;height:min(78dvh,760px)!important;max-height:78dvh!important;display:flex!important;flex-direction:column!important;border-radius:26px!important;background:#fff!important;overflow:hidden!important}.product-modal>img{display:block!important;width:100%!important;height:150px!important;flex:0 0 150px!important;object-fit:contain!important;object-position:center!important;background:#f7f0ec!important;cursor:zoom-in!important}.product-modal-info{padding:18px 22px 20px!important;overflow:hidden!important;display:flex!important;flex:1!important;min-height:0!important}.product-modal-info>.eyebrow,.product-modal-info>h2,.product-modal-info>.price{display:none!important}.product-modal-info:before{content:'Select Device' ;display:block;font-size:23px;font-weight:700;color:#24201e;padding:4px 48px 18px 0}.phone-model-fields{margin:0!important;gap:14px!important;overflow:hidden!important}.phone-model-fields>div:first-child label{display:none!important}.phone-model-fields>div:first-child:before{content:'Select brand';display:block;font-size:13px;font-weight:650;color:#65534d;margin-bottom:7px}.phone-model-fields input,.phone-model-fields select{min-height:52px!important;font-size:16px!important;border-radius:13px!important}.phone-model-fields>div:nth-child(3){display:block!important}.device-model-list{max-height:32dvh!important;flex:1 1 auto!important;min-height:80px!important;border-radius:13px!important}.device-model-option{padding:17px 15px!important;font-size:17px!important;min-height:60px!important}.product-modal-info>.primary{width:100%!important;min-height:52px!important;flex-shrink:0!important}.modal-close{right:14px!important;top:14px!important;width:38px!important;height:38px!important}}
    `}</style><div className="product-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" aria-label="Close device selector" onClick={()=>setSelected(null)}><X/></button><img src={selected.image_url} alt={selected.name} onClick={()=>setPreviewImage(selected.image_url)} style={{cursor:'zoom-in'}}/><div className="product-modal-info"><p className="eyebrow">{selected.code}</p><h2>{displayProductName(selected.name,selected.code)}</h2><strong className="price">₹{selected.price||599}</strong><div className="phone-model-fields"><div><label htmlFor="phone-brand-select">Choose brand</label><select id="phone-brand-select" value={selectedPhoneBrand} onChange={e=>{setSelectedPhoneBrand(e.target.value);setSelectedModel('');setModelSearch('');}}><option value="">Select brand</option>{phoneModelBrands.map(brand=><option key={brand} value={brand}>{brand}</option>)}</select></div><div><label htmlFor="phone-model-search">Search device</label><input id="phone-model-search" type="search" value={modelSearch} onChange={e=>{setModelSearch(e.target.value);setSelectedModel('');}} placeholder="Search device..."/></div>{selectedPhoneBrand&&<div className="device-model-list" role="listbox" aria-label="Available phone models">{filteredPhoneModels.length===0?<div className="device-model-empty">Not available</div>:filteredPhoneModels.map(m=>{const name=m.display_name||`${m.brand} ${m.model_name}`;return <button type="button" role="option" aria-selected={selectedModel===name} key={m.id} className={`device-model-option ${selectedModel===name?'active':''}`} onClick={()=>setSelectedModel(name)}>{name}</button>;})}</div>}</div><button className="primary full" onClick={addCart}>Add to bag</button></div></div></div>}
    {previewImage&&<div className="image-preview-backdrop" onClick={()=>setPreviewImage(null)} style={{position:'fixed',inset:0,zIndex:2147483000,background:'rgba(15,12,11,.94)',display:'flex',alignItems:'center',justifyContent:'center',padding:24,cursor:'zoom-out'}}><button type="button" className="image-preview-close" aria-label="Close image preview" onClick={e=>{e.stopPropagation();setPreviewImage(null);}} style={{position:'absolute',top:18,right:18,zIndex:2,width:46,height:46,border:0,borderRadius:'50%',background:'#fff',color:'#39251f',display:'grid',placeItems:'center',cursor:'pointer'}}><X/></button><img src={previewImage} alt="Full size product" onClick={e=>e.stopPropagation()} style={{display:'block',maxWidth:'96vw',maxHeight:'92vh',width:'auto',height:'auto',objectFit:'contain',borderRadius:8,cursor:'default'}}/></div>}
    {checkout&&<div className="modal-backdrop" onClick={()=>setCheckout(false)}><div className="checkout-modal" onClick={e=>e.stopPropagation()}><button className="modal-close" onClick={()=>setCheckout(false)}><X/></button><p className="eyebrow">YOUR SELECTION</p><h2>Your bag</h2>{cart.length===0?<p className="muted">Your bag is empty. Pick a design to get started.</p>:<><div className="cart-items">{cart.map(p=><div className="cart-item" key={p.cart_id}><img src={p.image_url} alt=""/><div><b>{displayProductName(p.name,p.code)}</b><small>{p.code} · {p.phone_model}</small><strong>₹{p.price}</strong></div><button onClick={()=>setCart(c=>c.filter(x=>x.cart_id!==p.cart_id))}><Trash2 size={16}/></button></div>)}</div><div className="cart-total"><span>Total</span><b>₹{total}</b></div><form onSubmit={placeOrder} className="customer-form"><h3>Delivery details</h3><label>Your name<input value={customer.name} onChange={e=>setCustomer({...customer,name:e.target.value})} required placeholder="Full name"/></label><label>Mobile number<input type="tel" pattern="[0-9+ ]{10,15}" value={customer.phone} onChange={e=>setCustomer({...customer,phone:e.target.value})} required placeholder="Your contact number"/></label><label>Full delivery address<input value={customer.address} onChange={e=>setCustomer({...customer,address:e.target.value})} required placeholder="House/Flat, street, area, city, state"/></label><label>PIN code<input type="text" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} value={customer.pincode} onChange={e=>setCustomer({...customer,pincode:e.target.value.replace(/\D/g,'').slice(0,6)})} required placeholder="Enter 6-digit PIN code"/></label><button className="primary full">Continue to WhatsApp <ExternalLink size={16}/></button><small className="muted">Your order details will be saved and WhatsApp will open with your order summary. No online payment is collected on this website.</small></form></>}</div></div>}
  </div>;
}

function displayProductName(name, fallback = '') {
  const text = String(name || fallback || '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  return text.length > 15
    ? text.slice(0, 15) + '...'
    : text;
}

function ImagesIcon(props){return <Package {...props}/>;}
