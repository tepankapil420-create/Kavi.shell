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
  const [selected,setSelected] = useState(null);
  const [imagePreview,setImagePreview] = useState(false);
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
  async function saveProduct(e){
    e.preventDefault();try{let image_url=productModal?.image_url||'';if(productForm.image)image_url=await uploadFile(productForm.image,'products');if(!image_url)throw new Error('Please choose a product image.');
      const payload={code:productForm.code.trim(),name:productForm.name.trim()||productForm.code.trim(),category_id:productForm.category_id,price:Number(productForm.price)||0,image_url,is_active:productForm.is_active};
      const r=productModal?.id?await supabase.from('products').update(payload).eq('id',productModal.id):await supabase.from('products').insert(payload);if(r.error)throw r.error;
      setProductModal(null);setProductForm(blankProduct);await loadData();setNotice('Product saved successfully.');
    }catch(e){setNotice(e.message||'Could not save product.');}}
