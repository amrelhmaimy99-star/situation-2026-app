const App = {
  currentPage:'dashboard', currentMonth:'04/2026', currentReservations:[], currentDetailReservation:null, pinBuffer:'', currentSort:'date',

  init() {
    this.hideSplash();
    if(Auth.hasPin()) { document.getElementById('login-screen').style.display='flex'; this.bindLogin(); }
    else { this.checkSetup(); }
    this.bindNavigation(); this.bindModals(); this.bindMonthSelectors(); this.bindSearch(); this.bindSettings(); this.bindRefresh(); this.bindSort(); this.bindAutoCalc(); this.bindWhatsApp(); this.bindFilters(); this.bindCopy(); this.bindPrint(); this.bindTheme();
    this.updateRatesTicker();
  },

  hideSplash() {
    setTimeout(()=>{document.getElementById('splash-screen').classList.add('hidden');
    setTimeout(()=>document.getElementById('splash-screen').style.display='none',500);},1800);
  },

  // ===== Login =====
  bindLogin() {
    const dots=document.querySelectorAll('#pin-display .pin-dot');
    document.querySelectorAll('.pin-key[data-val]').forEach(k=>{
      k.onclick=()=>{
        if(this.pinBuffer.length>=4)return;
        this.pinBuffer+=k.dataset.val;
        dots.forEach((d,i)=>d.classList.toggle('filled',i<this.pinBuffer.length));
        if(this.pinBuffer.length===4){
          if(Auth.verify(this.pinBuffer)){
            document.getElementById('login-screen').style.display='none'; this.checkSetup();
          } else {
            document.getElementById('pin-error').textContent='رمز خاطئ';
            dots.forEach(d=>{d.classList.remove('filled');d.classList.add('error');});
            setTimeout(()=>{dots.forEach(d=>d.classList.remove('error'));this.pinBuffer='';document.getElementById('pin-error').textContent='';},800);
          }
        }
      };
    });
    document.getElementById('pin-delete').onclick=()=>{
      this.pinBuffer=this.pinBuffer.slice(0,-1);
      dots.forEach((d,i)=>d.classList.toggle('filled',i<this.pinBuffer.length));
    };
  },

  checkSetup() {
    if(!API.baseUrl){
      setTimeout(()=>document.getElementById('setup-modal').style.display='flex',2200);
      document.getElementById('save-api-btn').onclick=()=>{
        const u=document.getElementById('api-url-input').value.trim();
        if(u){API.setUrl(u);document.getElementById('setup-modal').style.display='none';this.loadPage('dashboard');}
      };
      document.getElementById('demo-mode-btn').onclick=()=>{
        API.isDemo=true;document.getElementById('setup-modal').style.display='none';this.loadPage('dashboard');
      };
    } else { setTimeout(()=>this.loadPage('dashboard'),2200); }
  },

  updateRatesTicker() {
    const r=API.exchangeRates;
    const el=id=>document.getElementById(id);
    if(el('rate-usd'))el('rate-usd').textContent=r.USD;
    if(el('rate-eur'))el('rate-eur').textContent=r.EUR;
    if(el('rate-gbp'))el('rate-gbp').textContent=r.GBP;
    setTimeout(()=>this.updateRatesTicker(),60000);
  },

  // ===== Navigation =====
  bindNavigation() {
    document.querySelectorAll('.nav-item').forEach(b=>b.onclick=()=>this.navigateTo(b.dataset.page));
  },
  navigateTo(p) {
    this.currentPage=p;
    document.querySelectorAll('.page').forEach(x=>x.classList.remove('active'));
    document.getElementById('page-'+p).classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n=>n.classList.remove('active'));
    document.querySelector(`.nav-item[data-page="${p}"]`).classList.add('active');
    const t={dashboard:'الرئيسية',reservations:'الحجوزات',finance:'المالية',settings:'الإعدادات'};
    document.getElementById('page-title').textContent=t[p]||p;
    this.loadPage(p);
  },
  loadPage(p) {
    switch(p){case'dashboard':this.loadDashboard();break;case'reservations':this.loadReservations();break;case'finance':this.loadFinance();break;case'settings':this.loadSettings();break;}
    if(!this._monthCountsLoaded){this._monthCountsLoaded=true;this.loadMonthCounts();}
  },

  async loadMonthCounts() {
    const months=['01','02','03','04','05','06','07','08','09','10','11','12'];
    for(const m of months){
      try{
        const r=await API.getMonthData(m+'/2026');
        if(!r.success)continue;
        const c=r.data.length; if(!c)continue;
        document.querySelectorAll(`.month-btn[data-month="${m}/2026"]`).forEach(btn=>{
          if(!btn.querySelector('.month-count')){const b=document.createElement('span');b.className='month-count';b.textContent=c;btn.appendChild(b);}
        });
      }catch(e){}
    }
  },

  // ===== Dashboard =====
  async loadDashboard() {
    const ab=document.querySelector('#dashboard-month-selector .month-btn.active');
    const m=ab?ab.dataset.month:'all';
    try {
      const r=await API.getDashboardStats(m==='all'?'':m);
      if(!r.success)return;
      const s=r.stats;
      document.getElementById('stat-bookings').textContent=s.totalBookings;
      document.getElementById('stat-revenue-usd').textContent='$'+this.fmt(s.revenue.usd);
      document.getElementById('stat-revenue-egp').textContent=this.fmt(s.revenue.egp);
      document.getElementById('stat-net').textContent='EGP '+this.fmt(s.totalNetEGP);
      this.barChart('trips-chart',s.topTrips||[],['#3b82f6','#6366f1','#8b5cf6','#a855f7','#06b6d4','#10b981','#f59e0b','#ef4444']);
      this.barChart('trip-profit-chart',s.topTrips||[],['#10b981','#06b6d4','#3b82f6','#8b5cf6','#f59e0b','#ef4444']);
      this.renderNats('nationality-chart',s.nationalities||[]);
      this.renderToday(m);
      this.renderOverdue(m);
    } catch(e){this.toast('خطأ في تحميل البيانات','error');}
  },

  async renderOverdue(month) {
    const card=document.getElementById('overdue-card');
    const list=document.getElementById('overdue-list');
    try {
      const m=month&&month!=='all'?month:String(new Date().getMonth()+1).padStart(2,'0')+'/'+new Date().getFullYear();
      const r=await API.getMonthData(m); if(!r.success)return;
      const today=new Date(); today.setHours(0,0,0,0);
      const overdue=r.data.filter(x=>{
        const tp=x.price.egp+x.price.usd+x.price.eur+x.price.gbp;
        const td=x.deposit.egp+x.deposit.usd+x.deposit.eur+x.deposit.gbp;
        if(td>=tp||tp===0)return false;
        const p=x.date.split('/');if(p.length!==3)return false;
        const d=new Date(p[2],p[1]-1,p[0]); return d<today;
      }).slice(0,8);
      if(!overdue.length){card.style.display='none';return;}
      card.style.display='block';
      list.innerHTML=overdue.map(r=>{
        const rest=r.price.usd>0?'$'+(r.price.usd-r.deposit.usd):'EGP '+(r.price.egp-r.deposit.egp);
        return `<div class="overdue-item"><div class="overdue-info"><span class="overdue-trip">${r.trip}</span><span class="overdue-detail">${r.date} | ${r.hotel}</span></div><span class="overdue-amount">${rest}</span></div>`;
      }).join('');
    } catch(e){}
  },

  barChart(id,data,colors) {
    const c=document.getElementById(id);
    if(!data.length){c.innerHTML='<div class="empty-state"><i class="fas fa-chart-bar"></i><p>لا توجد بيانات</p></div>';return;}
    const mx=Math.max(...data.map(d=>d.count));
    c.innerHTML=data.map((d,i)=>`<div class="bar-item animate-in" style="animation-delay:${i*60}ms"><span class="bar-label">${d.name}</span><div class="bar-track"><div class="bar-fill" style="width:${d.count/mx*100}%;background:${colors[i%colors.length]}"><span>${d.count}</span></div></div></div>`).join('');
  },

  renderNats(id,data) {
    const c=document.getElementById(id);
    const cl=['#3b82f6','#10b981','#f59e0b','#ef4444','#8b5cf6','#06b6d4','#ec4899','#f97316'];
    const fl={pol:'🇵🇱',eng:'🇬🇧',arab:'🇸🇦',russ:'🇷🇺',italy:'🇮🇹',egy:'🇪🇬',spain:'🇪🇸',kaz:'🇰🇿',ukr:'🇺🇦'};
    c.innerHTML=data.map((d,i)=>`<div class="donut-legend-item animate-in" style="animation-delay:${i*50}ms"><div class="donut-color" style="background:${cl[i%cl.length]}"></div><span>${fl[d.name]||'🌍'} ${d.name}</span><span class="donut-count">${d.count}</span></div>`).join('')||'<div class="empty-state"><p>لا توجد بيانات</p></div>';
  },

  async renderToday(month) {
    const c=document.getElementById('today-trips-list');
    try {
      const m=month&&month!=='all'?month:String(new Date().getMonth()+1).padStart(2,'0')+'/'+new Date().getFullYear();
      const r=await API.getMonthData(m); if(!r.success)return;
      const t=new Date(),ts=`${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`;
      const tt=r.data.filter(x=>x.date===ts);
      const items=tt.length?tt:r.data.slice(0,5);
      const label=tt.length?`<div class="today-alert"><span class="today-alert-icon">🔔</span><div class="today-alert-text"><h4>${tt.length} رحلة اليوم</h4><p>${ts}</p></div></div>`:'<p style="color:var(--text-muted);font-size:0.8rem;margin-bottom:8px;">أقرب الرحلات:</p>';
      if(!items.length){c.innerHTML='<div class="empty-state"><i class="fas fa-umbrella-beach"></i><p>لا توجد رحلات</p></div>';return;}
      c.innerHTML=label+items.map(r=>`<div class="today-trip-item"><span class="today-trip-time">${r.pickup||'-'}</span><div class="today-trip-info"><div class="today-trip-name">${r.trip}</div><div class="today-trip-hotel">${r.hotel} ${r.room&&r.room!=='-'?'#'+r.room:''} | ${r.date}</div></div></div>`).join('');
    } catch(e){}
  },

  // ===== Reservations =====
  async loadReservations() {
    const ab=document.querySelector('#reservations-month-selector .month-btn.active');
    const m=ab?ab.dataset.month:'04/2026'; this.currentMonth=m;
    const l=document.getElementById('reservations-list');
    l.innerHTML='<div class="loading-state"><div class="spinner"></div><p>جاري تحميل الحجوزات...</p></div>';
    try {
      const r=await API.getMonthData(m);
      if(!r.success){l.innerHTML='<div class="empty-state"><i class="fas fa-exclamation-triangle"></i><p>خطأ في التحميل</p></div>';return;}
      this.currentReservations=r.data; this.populateFilterDropdowns(); this.sortAndRender();
    } catch(e){l.innerHTML='<div class="empty-state"><i class="fas fa-wifi"></i><p>تأكد من الاتصال</p></div>';}
  },

  sortAndRender() {
    let d=[...this.currentReservations];
    switch(this.currentSort){
      case'price': d.sort((a,b)=>(b.net||0)-(a.net||0)); break;
      case'status': d.sort((a,b)=>{const gs=r=>{const t=r.price.egp+r.price.usd+r.price.eur+r.price.gbp;const dp=r.deposit.egp+r.deposit.usd+r.deposit.eur+r.deposit.gbp;return t===0?2:dp>=t?0:dp>0?1:2;};return gs(a)-gs(b);}); break;
      case'trip': d.sort((a,b)=>a.trip.localeCompare(b.trip)); break;
      default: break; // date = original order
    }
    this.renderRes(d);
  },

  bindSort() {
    document.querySelectorAll('.sort-btn').forEach(b=>b.onclick=()=>{
      document.querySelectorAll('.sort-btn').forEach(x=>x.classList.remove('active'));
      b.classList.add('active'); this.currentSort=b.dataset.sort; this.sortAndRender();
    });
  },

  renderRes(data) {
    const l=document.getElementById('reservations-list');
    if(!data.length){l.innerHTML='<div class="empty-state"><i class="fas fa-calendar-times"></i><p>لا توجد حجوزات</p></div>';return;}
    let h='',ld='',unpaidCount=0;
    data.forEach((r,i)=>{
      if(r.date!==ld){ld=r.date;h+=`<div class="date-divider"><div class="date-divider-line"></div><span class="date-divider-text">${r.date} - ${r.day}</span><div class="date-divider-line"></div></div>`;}
      const tp=r.price.egp+r.price.usd+r.price.eur+r.price.gbp;
      const td=r.deposit.egp+r.deposit.usd+r.deposit.eur+r.deposit.gbp;
      const st=tp===0?'unpaid':td>=tp?'paid':td>0?'partial':'unpaid';
      if(st!=='paid')unpaidCount++;
      const sl=st==='paid'?'مدفوع':st==='partial'?'جزئي':'غير مدفوع';
      const pd=r.price.usd>0?'$'+r.price.usd:r.price.eur>0?'€'+r.price.eur:r.price.gbp>0?'£'+r.price.gbp:'EGP '+this.fmt(r.price.egp);
      h+=`<div class="reservation-card ${st} animate-in" style="animation-delay:${Math.min(i*30,300)}ms" data-index="${i}">
        <div class="res-card-top"><span class="res-trip">${r.trip}</span><span class="res-price">${pd}</span></div>
        <div class="res-card-mid">
          <span class="res-detail"><i class="fas fa-hotel"></i> ${r.hotel}</span>
          ${r.room&&r.room!=='-'?`<span class="res-detail"><i class="fas fa-door-open"></i> ${r.room}</span>`:''}
          <span class="res-detail"><i class="fas fa-users"></i> ${r.adults}</span>
          <span class="res-detail"><i class="fas fa-clock"></i> ${r.pickup}</span>
          <span class="res-detail"><i class="fas fa-globe"></i> ${r.nationality}</span>
        </div>
        <div class="res-card-bottom"><span class="res-status ${st}">${sl}</span><span class="res-date-badge">${r.supplier}</span></div></div>`;
    });
    l.innerHTML=h;
    l.querySelectorAll('.reservation-card').forEach(c=>c.onclick=()=>this.showDetail(parseInt(c.dataset.index)));
    // Update badge
    const navBtn=document.querySelector('.nav-item[data-page="reservations"]');
    const oldBadge=navBtn.querySelector('.alert-badge');
    if(oldBadge)oldBadge.remove();
    if(unpaidCount>0){const b=document.createElement('span');b.className='alert-badge';b.textContent=unpaidCount;navBtn.appendChild(b);}
  },

  bindSearch() {
    const inp=document.getElementById('search-input'); let db;
    inp.oninput=()=>{clearTimeout(db);db=setTimeout(()=>this.applyFilters(),300);};
  },

  // ===== Filters =====
  bindFilters() {
    ['filter-status','filter-supplier','filter-sales'].forEach(id=>{
      const el=document.getElementById(id); if(el)el.onchange=()=>this.applyFilters();
    });
  },
  populateFilterDropdowns() {
    const sups=new Set(), sls=new Set();
    this.currentReservations.forEach(r=>{if(r.supplier&&r.supplier!=='-')sups.add(r.supplier);if(r.sales&&r.sales!=='-')sls.add(r.sales);});
    const mkOpts=(id,set,lbl)=>{const el=document.getElementById(id);const v=el.value;el.innerHTML=`<option value="">${lbl}</option>`+[...set].sort().map(s=>`<option value="${s}">${s}</option>`).join('');el.value=v;};
    mkOpts('filter-supplier',sups,'كل الموردين');mkOpts('filter-sales',sls,'كل المبيعات');
  },
  applyFilters() {
    const q=(document.getElementById('search-input').value||'').toLowerCase().trim();
    const fs=document.getElementById('filter-status').value;
    const fsu=document.getElementById('filter-supplier').value;
    const fsl=document.getElementById('filter-sales').value;
    let d=this.currentReservations;
    if(q)d=d.filter(r=>r.trip.toLowerCase().includes(q)||r.hotel.toLowerCase().includes(q)||r.nationality.toLowerCase().includes(q)||r.supplier.toLowerCase().includes(q)||r.sales.toLowerCase().includes(q));
    if(fs)d=d.filter(r=>{const tp=r.price.egp+r.price.usd+r.price.eur+r.price.gbp;const td=r.deposit.egp+r.deposit.usd+r.deposit.eur+r.deposit.gbp;const st=tp===0?'unpaid':td>=tp?'paid':td>0?'partial':'unpaid';return st===fs;});
    if(fsu)d=d.filter(r=>r.supplier===fsu);
    if(fsl)d=d.filter(r=>r.sales===fsl);
    this.renderRes(d);
  },

  showDetail(i) {
    const r=this.currentReservations[i]; if(!r)return;
    this.currentDetailReservation={...r,_index:i};
    const egpEq=this.fmt(r.net||API.convertToEGP(r.price.usd,r.price.eur,r.price.gbp)+r.price.egp);
    document.getElementById('detail-modal-body').innerHTML=`
      <div class="detail-section"><h4><i class="fas fa-plane"></i> الرحلة</h4><div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">الرحلة</div><div class="detail-item-value" style="text-transform:capitalize">${r.trip}</div></div>
        <div class="detail-item"><div class="detail-item-label">التاريخ</div><div class="detail-item-value">${r.date} ${r.day}</div></div>
        <div class="detail-item"><div class="detail-item-label">بالغين</div><div class="detail-item-value">${r.adults}</div></div>
        <div class="detail-item"><div class="detail-item-label">أطفال/رضع</div><div class="detail-item-value">${r.children}/${r.infants}</div></div>
      </div></div>
      <div class="detail-section"><h4><i class="fas fa-hotel"></i> الإقامة</h4><div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">الفندق</div><div class="detail-item-value">${r.hotel}</div></div>
        <div class="detail-item"><div class="detail-item-label">الغرفة</div><div class="detail-item-value">${r.room}</div></div>
        <div class="detail-item"><div class="detail-item-label">الاستلام</div><div class="detail-item-value">${r.pickup}</div></div>
        <div class="detail-item"><div class="detail-item-label">الجنسية</div><div class="detail-item-value">${r.nationality}</div></div>
      </div></div>
      <div class="detail-section"><h4><i class="fas fa-money-bill"></i> المالية</h4><div class="detail-grid">
        <div class="detail-item full"><div class="detail-item-label">السعر</div><div class="detail-item-value">EGP${this.fmt(r.price.egp)} | $${r.price.usd} | €${r.price.eur} | £${r.price.gbp}</div></div>
        <div class="detail-item full"><div class="detail-item-label">المدفوع</div><div class="detail-item-value" style="color:var(--success)">EGP${this.fmt(r.deposit.egp)} | $${r.deposit.usd} | €${r.deposit.eur} | £${r.deposit.gbp}</div></div>
        <div class="detail-item full"><div class="detail-item-label">المتبقي</div><div class="detail-item-value" style="color:var(--warning)">EGP${this.fmt(r.rest.egp)} | $${r.rest.usd} | €${r.rest.eur} | £${r.rest.gbp}</div></div>
        <div class="detail-item"><div class="detail-item-label">صافي (EGP)</div><div class="detail-item-value" style="color:var(--gold);font-weight:700">EGP ${egpEq}</div></div>
      </div></div>
      <div class="detail-section"><h4><i class="fas fa-user-tie"></i> التشغيل</h4><div class="detail-grid">
        <div class="detail-item"><div class="detail-item-label">المورد</div><div class="detail-item-value">${r.supplier}</div></div>
        <div class="detail-item"><div class="detail-item-label">المبيعات</div><div class="detail-item-value">${r.sales}</div></div>
        ${r.notes&&r.notes!=='-'?`<div class="detail-item full"><div class="detail-item-label">ملاحظات</div><div class="detail-item-value">${r.notes}</div></div>`:''}
      </div></div>`;
    document.getElementById('detail-modal').style.display='flex';
  },

  // ===== Modals =====
  bindModals() {
    document.getElementById('close-detail-modal').onclick=()=>document.getElementById('detail-modal').style.display='none';
    document.getElementById('close-reservation-modal').onclick=()=>document.getElementById('reservation-modal').style.display='none';
    document.querySelectorAll('.modal-overlay').forEach(o=>o.onclick=()=>o.parentElement.style.display='none');
    document.getElementById('add-reservation-btn').onclick=()=>this.openAdd();
    document.getElementById('edit-from-detail-btn').onclick=()=>this.openEdit();
    document.getElementById('delete-from-detail-btn').onclick=()=>this.delRes();
    document.getElementById('reservation-form').onsubmit=e=>{e.preventDefault();this.saveRes();};
  },

  // ===== WhatsApp =====
  bindWhatsApp() {
    document.getElementById('whatsapp-share-btn').onclick=()=>{
      const r=this.currentDetailReservation; if(!r)return;
      const pd=r.price.usd>0?'$'+r.price.usd:r.price.eur>0?'€'+r.price.eur:r.price.gbp>0?'£'+r.price.gbp:'EGP '+r.price.egp;
      const msg=`🏖 *${r.trip}*\n📅 ${r.date} ${r.day}\n🏨 ${r.hotel} ${r.room!=='-'?'#'+r.room:''}\n👥 ${r.adults} adults\n⏰ Pickup: ${r.pickup}\n💰 Price: ${pd}\n🌍 ${r.nationality}`;
      window.open('https://wa.me/?text='+encodeURIComponent(msg),'_blank');
    };
  },

  // ===== Auto Calc Rest =====
  bindAutoCalc() {
    const fields=['res-price-egp','res-price-usd','res-price-eur','res-price-gbp','res-dep-egp','res-dep-usd','res-dep-eur','res-dep-gbp'];
    fields.forEach(id=>{
      const el=document.getElementById(id); if(!el)return;
      el.oninput=()=>this.calcRest();
    });
  },
  calcRest() {
    // Auto-calculate is informational only - rest is computed on save
  },

  openAdd() {
    document.getElementById('reservation-modal-title').innerHTML='<i class="fas fa-plus-circle"></i> إضافة حجز';
    document.getElementById('reservation-form').reset();
    document.getElementById('edit-row-index').value='';
    document.getElementById('edit-month').value=this.currentMonth;
    document.getElementById('reservation-modal').style.display='flex';
  },

  openEdit() {
    const r=this.currentDetailReservation; if(!r)return;
    document.getElementById('detail-modal').style.display='none';
    document.getElementById('reservation-modal-title').innerHTML='<i class="fas fa-edit"></i> تعديل حجز';
    document.getElementById('edit-row-index').value=r.rowIndex;
    document.getElementById('edit-month').value=this.currentMonth;
    const p=r.date.split('/');
    if(p.length===3)document.getElementById('res-date').value=`${p[2]}-${p[1]}-${p[0]}`;
    document.getElementById('res-trip').value=r.trip;
    document.getElementById('res-adults').value=r.adults;
    document.getElementById('res-children').value=r.children;
    document.getElementById('res-infants').value=r.infants;
    document.getElementById('res-hotel').value=r.hotel;
    document.getElementById('res-room').value=r.room;
    document.getElementById('res-pickup').value=r.pickup;
    document.getElementById('res-nationality').value=r.nationality;
    document.getElementById('res-price-egp').value=r.price.egp;
    document.getElementById('res-price-usd').value=r.price.usd;
    document.getElementById('res-price-eur').value=r.price.eur;
    document.getElementById('res-price-gbp').value=r.price.gbp;
    document.getElementById('res-dep-egp').value=r.deposit.egp;
    document.getElementById('res-dep-usd').value=r.deposit.usd;
    document.getElementById('res-dep-eur').value=r.deposit.eur;
    document.getElementById('res-dep-gbp').value=r.deposit.gbp;
    if(r.cost){document.getElementById('res-cost-egp').value=r.cost.egp;document.getElementById('res-cost-usd').value=r.cost.usd;document.getElementById('res-cost-eur').value=r.cost.eur;document.getElementById('res-cost-gbp').value=r.cost.gbp;}
    document.getElementById('res-supplier').value=r.supplier;
    document.getElementById('res-sales').value=r.sales;
    document.getElementById('res-notes').value=r.notes!=='-'?r.notes:'';
    document.getElementById('reservation-modal').style.display='flex';
  },

  async saveRes() {
    const dv=document.getElementById('res-date').value, dp=dv.split('-');
    const ds=dp.length===3?`${dp[2]}/${dp[1]}/${dp[0]}`:'';
    const dn=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
    const gv=id=>parseFloat(document.getElementById(id).value)||0;
    const row={reservationDate:'-',date:ds,day:dv?dn[new Date(dv).getDay()]:'',
      trip:document.getElementById('res-trip').value,
      adults:document.getElementById('res-adults').value||'-', children:document.getElementById('res-children').value||'-', infants:document.getElementById('res-infants').value||'-',
      hotel:document.getElementById('res-hotel').value||'-', room:document.getElementById('res-room').value||'-',
      pickup:document.getElementById('res-pickup').value||'-', nationality:document.getElementById('res-nationality').value||'-',
      priceEgp:gv('res-price-egp'), priceUsd:gv('res-price-usd'), priceEur:gv('res-price-eur'), priceGbp:gv('res-price-gbp'),
      depEgp:gv('res-dep-egp'), depUsd:gv('res-dep-usd'), depEur:gv('res-dep-eur'), depGbp:gv('res-dep-gbp'),
      restEgp:gv('res-price-egp')-gv('res-dep-egp'), restUsd:gv('res-price-usd')-gv('res-dep-usd'),
      restEur:gv('res-price-eur')-gv('res-dep-eur'), restGbp:gv('res-price-gbp')-gv('res-dep-gbp'),
      costEgp:gv('res-cost-egp'), costUsd:gv('res-cost-usd'), costEur:gv('res-cost-eur'), costGbp:gv('res-cost-gbp'),
      supplier:document.getElementById('res-supplier').value||'-', sales:document.getElementById('res-sales').value||'-',
      notes:document.getElementById('res-notes').value||'-'};
    const month=document.getElementById('edit-month').value, ri=document.getElementById('edit-row-index').value;
    try {
      if(ri) await API.updateReservation(month,parseInt(ri),row); else await API.addReservation(month,row);
      document.getElementById('reservation-modal').style.display='none';
      this.toast(ri?'تم تعديل الحجز ✅':'تم إضافة الحجز ✅','success'); this.loadReservations();
    } catch(e){this.toast('خطأ في الحفظ','error');}
  },

  async delRes() {
    const r=this.currentDetailReservation;
    if(!r||!confirm('هل أنت متأكد من حذف هذا الحجز؟'))return;
    try {
      await API.deleteReservation(this.currentMonth,r.rowIndex);
      document.getElementById('detail-modal').style.display='none';
      this.toast('تم حذف الحجز ✅','success'); this.loadReservations();
    } catch(e){this.toast('خطأ في الحذف','error');}
  },

  // ===== Finance =====
  async loadFinance() {
    const ab=document.querySelector('#finance-month-selector .month-btn.active');
    const m=ab?ab.dataset.month:'all';
    try {
      const r=await API.getDashboardStats(m==='all'?'':m); if(!r.success)return;
      const s=r.stats;
      document.getElementById('fin-rev-egp').textContent=this.fmt(s.revenue.egp);
      document.getElementById('fin-rev-usd').textContent='$'+this.fmt(s.revenue.usd);
      document.getElementById('fin-rev-eur').textContent='€'+this.fmt(s.revenue.eur);
      document.getElementById('fin-rev-gbp').textContent='£'+this.fmt(s.revenue.gbp);
      document.getElementById('fin-prof-egp').textContent=this.fmt(s.profit.egp);
      document.getElementById('fin-prof-usd').textContent='$'+this.fmt(s.profit.usd);
      document.getElementById('fin-prof-eur').textContent='€'+this.fmt(s.profit.eur);
      document.getElementById('fin-prof-gbp').textContent='£'+this.fmt(s.profit.gbp);
      document.getElementById('fin-net').textContent='EGP '+this.fmt(s.totalNetEGP);
      this.barChart('suppliers-chart',s.suppliers||[],['#10b981','#06b6d4','#3b82f6','#8b5cf6','#f59e0b']);
      if(s.sales)this.barChart('sales-chart',s.sales,['#f59e0b','#ef4444','#ec4899','#3b82f6','#10b981']);
      this.renderMonthlyComparison();
    } catch(e){}
  },

  async renderMonthlyComparison() {
    const container=document.getElementById('monthly-comparison');
    const months=['01','02','03','04','05','06','07','08','09','10','11','12'];
    const names=['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
    const counts=[];
    for(const m of months){
      try{const r=await API.getMonthData(m+'/2026');counts.push(r.success?r.data.length:0);}catch(e){counts.push(0);}
    }
    const max=Math.max(...counts,1);
    container.innerHTML=months.map((m,i)=>{
      const h=Math.round((counts[i]/max)*120);
      const color=counts[i]>0?`hsl(${210+i*12},70%,55%)`:'rgba(255,255,255,0.05)';
      return `<div class="month-col"><span class="month-col-val">${counts[i]||''}</span><div class="month-col-bar" style="height:${h}px;background:${color}"></div><span class="month-col-label">${names[i].substring(0,3)}</span></div>`;
    }).join('');
  },

  // ===== Settings =====
  loadSettings() {
    document.getElementById('settings-api-url').value=API.baseUrl||'';
    const st=document.getElementById('connection-status');
    if(API.baseUrl&&!API.isDemo){st.className='connection-status connected';st.innerHTML='<i class="fas fa-circle"></i><span>متصل بالشيت</span>';}
    else{st.className='connection-status disconnected';st.innerHTML='<i class="fas fa-circle"></i><span>'+(API.isDemo?'وضع تجريبي':'غير متصل')+'</span>';}
  },

  bindSettings() {
    document.getElementById('settings-save-btn').onclick=()=>{
      const u=document.getElementById('settings-api-url').value.trim();
      if(u){API.setUrl(u);this.toast('تم حفظ الرابط ✅','success');this.loadSettings();}
    };
    document.getElementById('settings-btn').onclick=()=>this.navigateTo('settings');
    document.getElementById('clear-cache-btn').onclick=()=>{
      if(confirm('هل أنت متأكد؟')){localStorage.clear();API.clearCache();API.init();location.reload();}
    };
    // PIN settings
    document.getElementById('settings-pin-save').onclick=()=>{
      const p=document.getElementById('settings-pin').value;
      if(p.length===4&&/^\d+$/.test(p)){Auth.setPin(p);this.toast('تم تعيين PIN ✅','success');document.getElementById('settings-pin').value='';}
      else this.toast('أدخل 4 أرقام','error');
    };
    document.getElementById('settings-pin-remove').onclick=()=>{
      Auth.removePin();this.toast('تم إزالة PIN ✅','success');
    };
  },

  bindMonthSelectors() {
    ['dashboard-month-selector','reservations-month-selector','finance-month-selector'].forEach(id=>{
      const c=document.getElementById(id); if(!c)return;
      c.querySelectorAll('.month-btn').forEach(b=>b.onclick=()=>{
        c.querySelectorAll('.month-btn').forEach(x=>x.classList.remove('active'));
        b.classList.add('active');
        if(id.includes('dashboard'))this.loadDashboard();
        else if(id.includes('reservations'))this.loadReservations();
        else if(id.includes('finance'))this.loadFinance();
      });
    });
  },

  bindRefresh() {
    document.getElementById('refresh-btn').onclick=()=>{
      const icon=document.getElementById('refresh-icon');
      icon.classList.add('refresh-spinning');
      API.clearCache(); API.fetchExchangeRates().then(()=>this.updateRatesTicker());
      this.loadPage(this.currentPage);
      setTimeout(()=>icon.classList.remove('refresh-spinning'),1000);
      this.toast('تم التحديث 🔄','success');
    };
  },

  fmt(n){return Number(n||0).toLocaleString('en-US');},
  toast(m,t=''){const el=document.getElementById('toast');el.textContent=m;el.className='toast '+t+' show';setTimeout(()=>el.classList.remove('show'),3000);},

  // ===== Copy Detail =====
  bindCopy() {
    document.getElementById('copy-detail-btn').onclick=()=>{
      const r=this.currentDetailReservation; if(!r)return;
      const pd=r.price.usd>0?'$'+r.price.usd:r.price.eur>0?'\u20ac'+r.price.eur:r.price.gbp>0?'\u00a3'+r.price.gbp:'EGP '+r.price.egp;
      const txt=`${r.trip} | ${r.date} ${r.day}\n${r.hotel} ${r.room!=='-'?'#'+r.room:''}\n${r.adults} pax | Pickup: ${r.pickup}\nPrice: ${pd} | ${r.nationality}\nSupplier: ${r.supplier} | Sales: ${r.sales}`;
      navigator.clipboard.writeText(txt).then(()=>this.toast('\u062a\u0645 \u0627\u0644\u0646\u0633\u062e \u2705','success')).catch(()=>this.toast('\u0641\u0634\u0644 \u0627\u0644\u0646\u0633\u062e','error'));
    };
  },

  // ===== Print Daily Report =====
  bindPrint() {
    document.getElementById('print-daily-btn').onclick=()=>{
      const t=new Date(),ts=`${String(t.getDate()).padStart(2,'0')}/${String(t.getMonth()+1).padStart(2,'0')}/${t.getFullYear()}`;
      const today=this.currentReservations.filter(r=>r.date===ts);
      if(!today.length){this.toast('\u0644\u0627 \u062a\u0648\u062c\u062f \u0631\u062d\u0644\u0627\u062a \u0627\u0644\u064a\u0648\u0645','error');return;}
      let html=`<html dir="rtl"><head><meta charset="UTF-8"><title>\u062a\u0642\u0631\u064a\u0631 \u064a\u0648\u0645\u064a - ${ts}</title><style>body{font-family:Arial,sans-serif;padding:20px}table{width:100%;border-collapse:collapse;margin-top:15px}th,td{border:1px solid #ddd;padding:8px;text-align:right;font-size:12px}th{background:#3b82f6;color:#fff}h1{font-size:18px;text-align:center}tr:nth-child(even){background:#f9f9f9}.total{font-weight:bold;background:#e8f4fd!important}</style></head><body>`;
      html+=`<h1>\ud83d\udcc5 \u062a\u0642\u0631\u064a\u0631 \u064a\u0648\u0645\u064a - ${ts}</h1>`;
      html+='<table><tr><th>#</th><th>\u0627\u0644\u0631\u062d\u0644\u0629</th><th>\u0627\u0644\u0641\u0646\u062f\u0642</th><th>\u063a\u0631\u0641\u0629</th><th>pax</th><th>Pickup</th><th>\u0627\u0644\u0633\u0639\u0631</th><th>\u0627\u0644\u0645\u0648\u0631\u062f</th></tr>';
      today.forEach((r,i)=>{
        const pd=r.price.usd>0?'$'+r.price.usd:r.price.eur>0?'\u20ac'+r.price.eur:'EGP '+r.price.egp;
        html+=`<tr><td>${i+1}</td><td>${r.trip}</td><td>${r.hotel}</td><td>${r.room}</td><td>${r.adults}</td><td>${r.pickup}</td><td>${pd}</td><td>${r.supplier}</td></tr>`;
      });
      html+=`<tr class="total"><td colspan="4">\u0625\u062c\u0645\u0627\u0644\u064a: ${today.length} \u0631\u062d\u0644\u0629</td><td colspan="4"></td></tr></table></body></html>`;
      const w=window.open('','_blank');w.document.write(html);w.document.close();w.print();
    };
  },

  // ===== Theme Toggle =====
  bindTheme() {
    const saved=localStorage.getItem('theme');
    if(saved==='light'){document.body.classList.add('light-mode');document.getElementById('theme-icon').className='fas fa-moon';}
    document.getElementById('theme-toggle-btn').onclick=()=>{
      document.body.classList.toggle('light-mode');
      const isLight=document.body.classList.contains('light-mode');
      document.getElementById('theme-icon').className=isLight?'fas fa-moon':'fas fa-sun';
      localStorage.setItem('theme',isLight?'light':'dark');
    };
  }
};

document.addEventListener('DOMContentLoaded',()=>App.init());
