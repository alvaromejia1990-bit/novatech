import { settings } from './shared.js';
import './data.js';

let clientPromise;
export function isConnected() {return !!(settings.supabaseUrl && settings.supabasePublishableKey && /^https:\/\/.+\.supabase\.co\/?$/.test(settings.supabaseUrl.trim()));}
export async function db() {
  if(!isConnected()) throw new Error('Configura la URL y la clave pública de Supabase en js/config.js.');
  if(!clientPromise) clientPromise = import('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm').then(({createClient}) => createClient(settings.supabaseUrl.trim(),settings.supabasePublishableKey.trim()));
  return clientPromise;
}
function unwrap({data,error}) {if(error) throw new Error(error.message||'Error de base de datos');return data;}
export async function publicProducts() {
  if(!isConnected())return window.DEMO_PRODUCTS.map(p => ({...p}));
  const sdk=await db();return unwrap(await sdk.from('products').select('id,reference,name,description,category,price,stock,sold_count,image_url,active').eq('active',true).order('created_at',{ascending:true}));
}
export async function submitOrder(items,name,phone,notes) {
  if(!isConnected())return null;
  const sdk=await db();
  return unwrap(await sdk.rpc('create_order',{p_items:items,p_customer_name:name,p_customer_phone:phone,p_notes:notes||''}));
}
export async function authSignIn(email,password){const sdk=await db();return unwrap(await sdk.auth.signInWithPassword({email,password}));}
export async function authSignOut(){const sdk=await db();return unwrap(await sdk.auth.signOut());}
export async function checkAdmin(){const sdk=await db();const user=unwrap(await sdk.auth.getUser()).user;if(!user)return false;return !!unwrap(await sdk.rpc('is_admin'));}
export async function adminProducts(){const sdk=await db();return unwrap(await sdk.from('products').select('*').order('created_at',{ascending:true}));}
export async function adminOrders(){const sdk=await db();const rows=[];const size=500;for(let start=0;;start+=size){const part=unwrap(await sdk.from('orders').select('id,order_code,customer_name,customer_phone,notes,total,status,created_at,confirmed_at,order_items(id,product_id,reference,product_name,qty,unit_price,line_total)').order('created_at',{ascending:false}).range(start,start+size-1));rows.push(...part);if(part.length<size)break;}return rows;}
export async function saveProduct(product){const sdk=await db();if(product.id){const {id,...fields}=product;return unwrap(await sdk.from('products').update(fields).eq('id',id).select().single());}const {id,...fields}=product;return unwrap(await sdk.from('products').insert(fields).select().single());}
export async function confirmOrder(id){const sdk=await db();return unwrap(await sdk.rpc('confirm_order',{p_order_id:id}));}
export async function cancelOrder(id){const sdk=await db();return unwrap(await sdk.rpc('cancel_order',{p_order_id:id}));}
