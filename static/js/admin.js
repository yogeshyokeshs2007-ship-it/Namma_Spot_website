(() => {
  const $ = (selector) => document.querySelector(selector);
  const $$ = (selector) => [...document.querySelectorAll(selector)];
  const state = { menu: [], settings: {}, tab: 'overview' };
  let toastTimer;
  const escapeHTML = (value = '') => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const money = n => '₹' + Number(n || 0).toLocaleString('en-IN', {maximumFractionDigits: 2});
  const fallbackImage = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=180&q=70';
  function toast(text) { const el=$('#adminToast'); el.textContent=text; el.classList.add('show'); clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.classList.remove('show'),2800); }
  async function api(url, options={}) {
    const response = await fetch(url, { credentials:'same-origin', ...options, headers:{'Content-Type':'application/json', ...(options.headers||{})} });
    const data = await response.json().catch(()=>({}));
    if (!response.ok) { if (response.status===401) showLogin(); throw new Error(data.error || 'Something went wrong.'); }
    return data;
  }
  function showLogin() { $('#loginScreen').classList.remove('hidden'); $('#appShell').classList.add('hidden'); }
  function showApp() { $('#loginScreen').classList.add('hidden'); $('#appShell').classList.remove('hidden'); }
  function setTab(tab) {
    state.tab=tab;
    $$('.panel-view').forEach(el=>el.classList.add('hidden'));
    $(`#${tab}Panel`).classList.remove('hidden');
    $$('.side-link[data-tab]').forEach(el=>el.classList.toggle('active',el.dataset.tab===tab));
    $('#pageTitle').textContent = ({overview:'Overview',menu:'Manage menu',settings:'Shop settings'})[tab] || 'Overview';
    if (tab==='menu') renderMenuTable();
    if (tab==='settings') fillSettings();
  }
  async function refreshData() {
    const [menu, settings] = await Promise.all([api('/api/menu?all=1'),api('/api/settings')]);
    state.menu=menu; state.settings=settings;
    renderStats(); renderRecent(); renderMenuFilter(); renderMenuTable(); fillSettings();
  }
  function renderStats() {
    $('#statItems').textContent=state.menu.length;
    $('#statAvailable').textContent=state.menu.filter(i=>i.available!==false).length;
    $('#statFeatured').textContent=state.menu.filter(i=>i.featured).length;
  }
  function dishCell(item) { return `<div class="table-dish"><img src="${escapeHTML(item.image || fallbackImage)}" alt="" onerror="this.onerror=null;this.src='${fallbackImage}'"><div><b>${escapeHTML(item.name)}</b><small>${escapeHTML(item.description || 'No description added')}</small></div></div>`; }
  function renderRecent() {
    const recent=[...state.menu].slice(-5).reverse();
    $('#recentItems').innerHTML=recent.length?recent.map(i=>`<tr><td>${dishCell(i)}</td><td>${escapeHTML(i.category)}</td><td><b>${money(i.price)}</b></td><td><span class="status-pill ${i.available===false?'hidden':'available'}">${i.available===false?'Hidden':'Available'}</span></td></tr>`).join(''):'<tr><td colspan="4" class="table-empty">No menu items yet. Add your first dish.</td></tr>';
  }
  function renderMenuFilter() {
    const current=$('#adminCategoryFilter').value || 'All';
    const cats=['All',...new Set(state.menu.map(i=>i.category).filter(Boolean))];
    $('#adminCategoryFilter').innerHTML=cats.map(c=>`<option value="${escapeHTML(c)}">${escapeHTML(c==='All'?'All categories':c)}</option>`).join('');
    $('#adminCategoryFilter').value=cats.includes(current)?current:'All';
    $('#categoryOptions').innerHTML=cats.filter(c=>c!=='All').map(c=>`<option>${escapeHTML(c)}</option>`).join('');
  }
  function renderMenuTable() {
    if (!$('#menuTable')) return;
    const q=$('#adminMenuSearch').value.trim().toLowerCase(), cat=$('#adminCategoryFilter').value, status=$('#adminStatusFilter').value;
    const list=state.menu.filter(i=>(cat==='All'||i.category===cat)&&(!q||`${i.name} ${i.category} ${i.description||''}`.toLowerCase().includes(q))&&(status==='All'||(status==='Available'?i.available!==false:i.available===false)));
    $('#menuTable').innerHTML=list.length?list.map(i=>`<tr><td>${dishCell(i)}</td><td>${escapeHTML(i.category)}</td><td><b>${money(i.price)}</b></td><td>${i.featured?'<span class="status-pill available">Featured</span>':'<span style="color:#777">—</span>'}</td><td><span class="status-pill ${i.available===false?'hidden':'available'}">${i.available===false?'Hidden':'Available'}</span></td><td><div class="action-buttons"><button class="small-btn" data-edit="${i.id}">Edit</button><button class="small-btn" data-toggle="${i.id}">${i.available===false?'Show':'Hide'}</button><button class="small-btn danger" data-delete="${i.id}">Delete</button></div></td></tr>`).join(''):'<tr><td colspan="6" class="table-empty">No menu items match these filters.</td></tr>';
    $('#menuCount').textContent=`Showing ${list.length} of ${state.menu.length} menu items`;
  }
  function fillSettings() {
    const form=$('#settingsForm'); if (!form || !state.settings) return;
    Object.entries(state.settings).forEach(([key,value])=>{const field=form.elements.namedItem(key); if(field) field.value=value ?? '';});
  }
  function openItemModal(item=null) {
    const form=$('#itemForm'); form.reset(); form.elements.namedItem('id').value=item?.id ?? '';
    form.elements.namedItem('name').value=item?.name ?? '';
    form.elements.namedItem('category').value=item?.category ?? '';
    form.elements.namedItem('price').value=item?.price ?? '';
    form.elements.namedItem('image').value=item?.image ?? '';
    form.elements.namedItem('description').value=item?.description ?? '';
    form.elements.namedItem('featured').checked=!!item?.featured;
    form.elements.namedItem('available').checked=item?item.available!==false:true;
    $('#itemModalTitle').innerHTML=item?'Edit <em>menu item</em>':'Add a <em>menu item</em>';
    $('#saveItemButton').textContent=item?'Save changes ↗':'Save menu item ↗';
    $('#itemFormMessage').textContent=''; $('#itemFormMessage').className='form-message';
    $('#itemModalBackdrop').classList.remove('hidden');
    form.elements.namedItem('name').focus();
  }
  function closeItemModal() { $('#itemModalBackdrop').classList.add('hidden'); }
  function itemPayload(form) {
    const fd=new FormData(form); return {name:String(fd.get('name')||'').trim(),category:String(fd.get('category')||'').trim(),price:Number(fd.get('price')),image:String(fd.get('image')||'').trim(),description:String(fd.get('description')||'').trim(),featured:form.elements.namedItem('featured').checked,available:form.elements.namedItem('available').checked};
  }
  $('#loginForm').addEventListener('submit', async event=>{
    event.preventDefault(); const message=$('#loginMessage'); const button=$('#loginButton'); message.textContent=''; button.disabled=true; button.textContent='Signing in…';
    try { await api('/api/admin/login',{method:'POST',body:JSON.stringify({password:$('#adminPassword').value})}); $('#adminPassword').value=''; showApp(); await refreshData(); setTab('overview'); }
    catch(error){message.textContent=error.message;}
    finally{button.disabled=false;button.innerHTML='Sign in <span>↗</span>';}
  });
  $('#logoutButton').addEventListener('click', async()=>{try{await api('/api/admin/logout',{method:'POST',body:'{}'});}catch{} showLogin(); toast('You have been logged out.');});
  $$('.side-link[data-tab]').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.tab)));
  $$('[data-go-tab]').forEach(button=>button.addEventListener('click',()=>setTab(button.dataset.goTab)));
  $('#addItemButton').addEventListener('click',()=>openItemModal());
  $('#closeItemModal').addEventListener('click',closeItemModal); $('#cancelItemModal').addEventListener('click',closeItemModal);
  $('#itemModalBackdrop').addEventListener('click',e=>{if(e.target===$('#itemModalBackdrop'))closeItemModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeItemModal();});
  $('#adminMenuSearch').addEventListener('input',renderMenuTable); $('#adminCategoryFilter').addEventListener('change',renderMenuTable); $('#adminStatusFilter').addEventListener('change',renderMenuTable);
  $('#menuTable').addEventListener('click',async event=>{
    const edit=event.target.closest('[data-edit]'); const toggle=event.target.closest('[data-toggle]'); const del=event.target.closest('[data-delete]');
    try {
      if(edit){const item=state.menu.find(i=>Number(i.id)===Number(edit.dataset.edit)); if(item)openItemModal(item);}
      if(toggle){const item=state.menu.find(i=>Number(i.id)===Number(toggle.dataset.toggle)); if(!item)return; await api(`/api/admin/menu/${item.id}`,{method:'PUT',body:JSON.stringify({...item,available:item.available===false})}); await refreshData(); toast(item.available===false?'Dish is now visible on your website.':'Dish hidden from website.');}
      if(del){const item=state.menu.find(i=>Number(i.id)===Number(del.dataset.delete)); if(!item)return; if(!confirm(`Delete “${item.name}” from the menu? This cannot be undone.`))return; await api(`/api/admin/menu/${item.id}`,{method:'DELETE'}); await refreshData(); toast('Menu item deleted.');}
    }catch(error){toast(error.message);}
  });
  $('#itemForm').addEventListener('submit',async event=>{
    event.preventDefault(); const form=event.currentTarget; const id=form.elements.namedItem('id').value; const payload=itemPayload(form); const button=$('#saveItemButton');
    if(!payload.name||!payload.category||!Number.isFinite(payload.price)||payload.price<0){$('#itemFormMessage').textContent='Enter a dish name, category, and valid non-negative price.';return;}
    button.disabled=true; button.textContent='Saving…';
    try{await api(id?`/api/admin/menu/${id}`:'/api/admin/menu',{method:id?'PUT':'POST',body:JSON.stringify(payload)});await refreshData();closeItemModal();setTab('menu');toast(id?'Menu item updated.':'Menu item added.');}
    catch(error){$('#itemFormMessage').textContent=error.message;}
    finally{button.disabled=false;button.textContent=id?'Save changes ↗':'Save menu item ↗';}
  });
  $('#settingsForm').addEventListener('submit',async event=>{
    event.preventDefault(); const form=event.currentTarget; const payload={}; for(const [key,value] of new FormData(form).entries())payload[key]=String(value).trim();
    const button=$('#saveSettingsButton'), message=$('#settingsMessage');button.disabled=true;button.textContent='Saving…';message.textContent='';message.className='form-message';
    try{state.settings=await api('/api/admin/settings',{method:'PUT',body:JSON.stringify(payload)});message.textContent='Settings saved successfully.';message.classList.add('success');toast('Shop settings saved.');}
    catch(error){message.textContent=error.message;}
    finally{button.disabled=false;button.textContent='Save shop settings ↗';}
  });
  async function start(){try{const s=await api('/api/admin/status');if(s.logged_in){showApp();await refreshData();setTab('overview');}else showLogin();}catch{showLogin();}}
  start();
})();
