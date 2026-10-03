'use strict';
/*
 * Optional cloud synchronization via Supabase REST API.
 * Configure a Supabase project using supabase/schema.sql, then enter the
 * project URL + anon/publishable key in Settings. Passwords are never stored.
 */
(function(root){
  const CONFIG_KEY='rental-cloud-config-v1', SESSION_KEY='rental-cloud-session-v1';
  const read=(k, fallback=null)=>{try{return JSON.parse(localStorage.getItem(k))??fallback}catch{return fallback}};
  const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));
  const config=()=>read(CONFIG_KEY,{url:'',key:''});
  const session=()=>read(SESSION_KEY,null);
  const saveSession=s=>write(SESSION_KEY,s);
  const clearSession=()=>localStorage.removeItem(SESSION_KEY);
  const cleanUrl=u=>String(u||'').trim().replace(/\/+$/,'');
  async function request(path, options={}, retry=true){
    const c=config(), s=session();
    if(!c.url||!c.key) throw Error('Сначала укажите URL проекта Supabase и anon/publishable key.');
    const headers={'apikey':c.key,'Content-Type':'application/json',...(options.headers||{})};
    if(s?.access_token) headers.Authorization='Bearer '+s.access_token;
    let res=await fetch(cleanUrl(c.url)+path,{...options,headers});
    if(res.status===401 && retry && s?.refresh_token){
      const refreshed=await fetch(cleanUrl(c.url)+'/auth/v1/token?grant_type=refresh_token',{
        method:'POST',headers:{'apikey':c.key,'Content-Type':'application/json'},
        body:JSON.stringify({refresh_token:s.refresh_token})
      });
      if(refreshed.ok){
        const ns=await refreshed.json(); saveSession(ns);
        return request(path,options,false);
      }
    }
    if(!res.ok){
      let message='Ошибка облачного сервиса';
      try { const x=await res.json(); message=x.msg||x.message||x.error_description||x.error||message; } catch {}
      throw Error(message);
    }
    if(res.status===204)return null;
    return res.json();
  }
  async function signIn(email,password){
    const c=config();
    if(!c.url||!c.key) throw Error('Укажите URL проекта Supabase и anon/publishable key.');
    const res=await fetch(cleanUrl(c.url)+'/auth/v1/token?grant_type=password',{method:'POST',
      headers:{'apikey':c.key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    if(!res.ok){let x={};try{x=await res.json()}catch{} throw Error(x.error_description||x.msg||'Не удалось войти.');}
    const s=await res.json(); saveSession(s); return s.user;
  }
  async function signUp(email,password){
    const c=config();
    const res=await fetch(cleanUrl(c.url)+'/auth/v1/signup',{method:'POST',
      headers:{'apikey':c.key,'Content-Type':'application/json'},body:JSON.stringify({email,password})});
    if(!res.ok){let x={};try{x=await res.json()}catch{} throw Error(x.msg||x.error_description||'Не удалось создать аккаунт.');}
    const s=await res.json();
    if(s.access_token) saveSession(s);
    return s.user;
  }
  function user(){return session()?.user||null}
  function logout(){clearSession()}
  function setConfig(url,key){
    const c={url:cleanUrl(url),key:String(key||'').trim()};
    if(c.url&&!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(c.url)) throw Error('URL должен иметь вид https://xxxxx.supabase.co');
    if(c.url&&!c.key) throw Error('Введите anon/publishable key.');
    write(CONFIG_KEY,c); return c;
  }
  async function pull(){
    if(!user()) throw Error('Войдите в облачный аккаунт.');
    const rows=await request('/rest/v1/rental_databases?select=version,data,updated_at&limit=1');
    return rows[0]||null;
  }
  async function push(data, expectedVersion=0){
    if(!user()) throw Error('Войдите в облачный аккаунт.');
    return request('/rest/v1/rpc/sync_rental_database',{method:'POST',body:JSON.stringify({p_data:data,p_expected_version:Number(expectedVersion)||0})});
  }
  root.RentalCloud={config,setConfig,session,user,signIn,signUp,logout,pull,push};
})(globalThis);
