/* Minimal XLSX reader for the app's import format. Supports .xlsx ZIP/XML, shared strings and numeric/date cells. */
window.RentalXlsx = (() => {
  const EOCD=0x06054b50, CEN=0x02014b50, LOC=0x04034b50;
  const u16=(v,o)=>v.getUint16(o,true), u32=(v,o)=>v.getUint32(o,true);
  async function unzip(file){
    const bytes=new Uint8Array(await file.arrayBuffer()), dv=new DataView(bytes.buffer);
    let eocd=-1;
    for(let i=bytes.length-22;i>=Math.max(0,bytes.length-65557);i--) if(u32(dv,i)===EOCD){eocd=i;break;}
    if(eocd<0) throw Error('Это не корректный XLSX-файл.');
    const count=u16(dv,eocd+10), cdSize=u32(dv,eocd+12), cdOffset=u32(dv,eocd+16); const out={}; let p=cdOffset;
    for(let i=0;i<count;i++){
      if(u32(dv,p)!==CEN) throw Error('Повреждён XLSX-файл.');
      const method=u16(dv,p+10), csize=u32(dv,p+20), usize=u32(dv,p+24), nlen=u16(dv,p+28), xlen=u16(dv,p+30), clen=u16(dv,p+32), loff=u32(dv,p+42);
      const name=new TextDecoder().decode(bytes.subarray(p+46,p+46+nlen));
      const lp=loff, ln=u16(dv,lp+26), lx=u16(dv,lp+28), start=lp+30+ln+lx;
      const raw=bytes.subarray(start,start+csize); let data;
      if(method===0) data=raw;
      else if(method===8){ if(!('DecompressionStream' in window)) throw Error('Этот браузер не поддерживает чтение XLSX. Обновите Safari/Chrome.'); const ds=new DecompressionStream('deflate-raw'); data=new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(ds)).arrayBuffer()); }
      else throw Error('Неподдерживаемое сжатие XLSX.');
      if(usize && data.length!==usize) throw Error('Не удалось распаковать XLSX-файл.');
      out[name]=data; p+=46+nlen+xlen+clen;
    }
    return out;
  }
  const text=u=>new TextDecoder('utf-8').decode(u);
  const xml=(u)=>new DOMParser().parseFromString(text(u),'application/xml');
  const colIndex=s=>{let n=0;for(const c of s){if(c<'A'||c>'Z')break;n=n*26+c.charCodeAt(0)-64;}return n-1;};
  const excelDate=n=>{const epoch=Date.UTC(1899,11,30); return new Date(epoch+n*86400000).toISOString().slice(0,10);};
  async function read(file){
    if(!/\.xlsx$/i.test(file.name)) throw Error('Выберите файл .xlsx.');
    const z=await unzip(file), shared=[];
    if(z['xl/sharedStrings.xml']) for(const si of xml(z['xl/sharedStrings.xml']).getElementsByTagName('si')) shared.push(Array.from(si.getElementsByTagName('t')).map(x=>x.textContent).join(''));
    const sheet=z['xl/worksheets/sheet1.xml']; if(!sheet) throw Error('В XLSX не найден первый лист.');
    const doc=xml(sheet), rows=[];
    for(const row of doc.getElementsByTagName('row')){
      const cells=[];
      for(const c of row.getElementsByTagName('c')){
        const ref=c.getAttribute('r')||'', idx=colIndex(ref.replace(/\d+$/,'')); let value=''; const type=c.getAttribute('t');
        if(type==='inlineStr') value=Array.from(c.getElementsByTagName('t')).map(x=>x.textContent).join('');
        else { const v=c.getElementsByTagName('v')[0]?.textContent??''; if(type==='s') value=shared[Number(v)]??''; else if(type==='b') value=v==='1'; else value=v; }
        cells[idx]=value;
      }
      rows.push(cells);
    }
    return rows;
  }
  return {read,excelDate};
})();
