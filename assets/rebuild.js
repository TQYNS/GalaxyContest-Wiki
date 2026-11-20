/* L1 公开层 · 自动验签 + 解密 + Canvas 重建引擎
 * 无用户输入。提供 window.MFRebuild.decode(id) -> Promise<HTMLCanvasElement>
 * 公钥以乱序反转分片存放（pubParts），运行时还原，避免明文常量被批量扫描。
 * 安全定位：防批量爬虫（仓库里没有 .png、没有明文像素），不防人工逆向。
 */
(function () {
  'use strict';
  const MAGIC='MFSC', VER=2, NONCE_LEN=12, SIG_LEN=64;
  // 缓存解密后的像素数据（非 canvas 节点）：每次 decode 返回全新 canvas，
  // 避免同一节点被 appendChild 到弹窗时从原卡片「移动」走导致图片消失。
  const cache = Object.create(null);

  function b64ToBytes(s){
    const bin=atob(s), out=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
    return out;
  }
  // 公钥脱敏还原：pubParts 为「整体逆序 + 每段字符反转」的 base64 分片
  function restorePub(){
    const mf=window.MF_MANIFEST||{};
    if(mf.pubParts && mf.pubParts.length){
      return mf.pubParts.slice().reverse().map(s=>s.split('').reverse().join('')).join('');
    }
    return mf.pub || ''; // 兼容旧版
  }
  async function importPub(der){
    return crypto.subtle.importKey('spki',b64ToBytes(der),{name:'Ed25519'},false,['verify']);
  }
  async function importAes(){
    const parts=(window.MF_KEY_PARTS||[]).slice().reverse();
    const bytes=new Uint8Array(32); let off=0;
    parts.forEach(p=>{const b=b64ToBytes(p);bytes.set(b,off);off+=b.length;});
    return crypto.subtle.importKey('raw',bytes,{name:'AES-GCM'},false,['decrypt']);
  }
  // manifest.file 形如 ./data/x.dat，由页面 <head> 的 <base> 统一解析，无需手工拼接。
  let pubPromise=null, aesPromise=null;
  function keys(){
    if(!pubPromise) pubPromise=importPub(restorePub());
    if(!aesPromise) aesPromise=importAes();
    return Promise.all([pubPromise,aesPromise]);
  }

  async function decode(item){
    if(!item || !item.file) throw new Error('无效条目');
    let store=cache[item.id];
    if(!store){
      const url=item.file;
      const res=await fetch(url,{cache:'force-cache'});
      if(!res.ok) throw new Error('无法读取 '+url);
      const buf=await res.arrayBuffer();
      const bytes=new Uint8Array(buf), dv=new DataView(buf);
      if(String.fromCharCode(...bytes.slice(0,4))!==MAGIC) throw new Error('文件格式不符');
      if(bytes[4]!==VER) throw new Error('版本不符');
      const w=dv.getUint16(5,false), h=dv.getUint16(7,false);
      const nonce=bytes.slice(9,9+NONCE_LEN);
      const sig=bytes.slice(9+NONCE_LEN,9+NONCE_LEN+SIG_LEN);
      const ct=bytes.slice(9+NONCE_LEN+SIG_LEN);
      const [pub,aes]=await keys();
      const signed=new Uint8Array((9+NONCE_LEN)+ct.length);
      signed.set(bytes.slice(0,9+NONCE_LEN),0);
      signed.set(ct,9+NONCE_LEN);
      const ok=await crypto.subtle.verify('Ed25519',pub,sig,signed);
      if(!ok) throw new Error('验签失败：数据可能被篡改');
      const raw=await crypto.subtle.decrypt({name:'AES-GCM',iv:nonce},aes,ct);
      // 只缓存像素字节与尺寸，不缓存 DOM 节点
      store={w,h,pixels:new Uint8ClampedArray(raw)};
      cache[item.id]=store;
    }
    // 每次都创建全新 canvas 并拷贝像素，保证卡片与弹窗互不干扰
    const cv=document.createElement('canvas');
    cv.width=store.w; cv.height=store.h;
    cv.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(store.pixels),store.w,store.h),0,0);
    return cv;
  }

  window.MFRebuild = {
    decode,
    items: function(){ return (window.MF_MANIFEST&&window.MF_MANIFEST.items)||[]; },
    map: function(){
      const m=Object.create(null);
      this.items().forEach(it=>{ m[it.id]=it; });
      return m;
    },
  };
})();
