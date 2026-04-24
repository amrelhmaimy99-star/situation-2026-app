// ===== API Layer =====
const API = {
  baseUrl: '',
  isDemo: false,
  cache: {},
  exchangeRates: { USD: 47, EUR: 55, GBP: 62 },

  init() {
    this.baseUrl = localStorage.getItem('apiUrl') || '';
    this.isDemo = !this.baseUrl;
    this.loadCachedRates();
    this.fetchExchangeRates();
  },

  setUrl(url) {
    this.baseUrl = url;
    this.isDemo = false;
    localStorage.setItem('apiUrl', url);
  },

  // ===== Exchange Rates =====
  async fetchExchangeRates() {
    try {
      const res = await fetch('https://open.er-api.com/v6/latest/EGP');
      const data = await res.json();
      if (data && data.rates) {
        this.exchangeRates = {
          USD: Math.round(1 / data.rates.USD * 100) / 100,
          EUR: Math.round(1 / data.rates.EUR * 100) / 100,
          GBP: Math.round(1 / data.rates.GBP * 100) / 100
        };
        localStorage.setItem('exchangeRates', JSON.stringify(this.exchangeRates));
        localStorage.setItem('ratesDate', new Date().toISOString());
      }
    } catch (e) { console.warn('Exchange rate fetch failed, using cached/default'); }
  },

  loadCachedRates() {
    const cached = localStorage.getItem('exchangeRates');
    if (cached) this.exchangeRates = JSON.parse(cached);
  },

  convertToEGP(usd, eur, gbp) {
    return (usd || 0) * this.exchangeRates.USD + (eur || 0) * this.exchangeRates.EUR + (gbp || 0) * this.exchangeRates.GBP;
  },

  // ===== API Requests =====
  async request(action, params = {}) {
    if (this.isDemo) return this.getDemoData(action, params);
    const url = new URL(this.baseUrl);
    url.searchParams.set('action', action);
    Object.entries(params).forEach(([k, v]) => {
      if (typeof v !== 'object') url.searchParams.set(k, String(v));
    });
    try {
      let opts = { redirect: 'follow' };
      if (params.data) {
        url.searchParams.set('data', JSON.stringify(params.data));
      }
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error('Network error: ' + res.status);
      return await res.json();
    } catch (err) { console.error('API Error:', err); throw err; }
  },

  async getMonthData(month) {
    const ck = 'month_' + month;
    if (this.cache[ck]) return this.cache[ck];
    const r = await this.request('getMonthData', { month });
    if (r.success) this.cache[ck] = r;
    return r;
  },

  async getDashboardStats(month) {
    return this.request('getDashboardStats', { month: month || '' });
  },

  async addReservation(month, row) {
    this.clearCache();
    return this.request('addReservation', { data: { month, row } });
  },

  async updateReservation(month, rowIndex, row) {
    this.clearCache();
    return this.request('updateReservation', { data: { month, rowIndex, row } });
  },

  async deleteReservation(month, rowIndex) {
    this.clearCache();
    return this.request('deleteReservation', { month, rowIndex });
  },

  clearCache() { this.cache = {}; },

  // ===== Demo Data =====
  getDemoData(action, params) {
    const D = [
      { rowIndex:3, date:'01/04/2026', day:'Wednesday', trip:'sinai moses', adults:'4', children:'-', infants:'-', hotel:'dahab lagiin', room:'325', pickup:'22:00', nationality:'pol', price:{egp:0,usd:180,eur:0,gbp:0}, deposit:{egp:0,usd:0,eur:0,gbp:0}, rest:{egp:0,usd:180,eur:0,gbp:0}, supplier:'amgad', sales:'alex', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:180,eur:0,gbp:0}, net:8460 },
      { rowIndex:4, date:'01/04/2026', day:'Wednesday', trip:'city tour', adults:'2', children:'-', infants:'-', hotel:'ivy cyrene sharm', room:'-', pickup:'16:15', nationality:'pol', price:{egp:0,usd:30,eur:0,gbp:0}, deposit:{egp:0,usd:30,eur:0,gbp:0}, rest:{egp:0,usd:0,eur:0,gbp:0}, supplier:'hafez', sales:'alex', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:30,eur:0,gbp:0}, net:1410 },
      { rowIndex:5, date:'01/04/2026', day:'Wednesday', trip:'ras mohamed', adults:'2', children:'-', infants:'-', hotel:'panorama naama', room:'1125', pickup:'8:00', nationality:'arab', price:{egp:0,usd:60,eur:0,gbp:0}, deposit:{egp:0,usd:0,eur:0,gbp:0}, rest:{egp:0,usd:60,eur:0,gbp:0}, supplier:'butter fly', sales:'essam', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:60,eur:0,gbp:0}, net:2820 },
      { rowIndex:6, date:'01/04/2026', day:'Wednesday', trip:'priv buggy', adults:'2dbl', children:'-', infants:'-', hotel:'cleopatra', room:'3253', pickup:'15:00', nationality:'pol', price:{egp:0,usd:110,eur:0,gbp:0}, deposit:{egp:0,usd:0,eur:0,gbp:0}, rest:{egp:0,usd:110,eur:0,gbp:0}, supplier:'square', sales:'marta', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:110,eur:0,gbp:0}, net:5170 },
      { rowIndex:7, date:'02/04/2026', day:'Thursday', trip:'cairo GEM', adults:'2', children:'-', infants:'-', hotel:'grand plaza', room:'1303', pickup:'23:30', nationality:'pol', price:{egp:0,usd:220,eur:0,gbp:0}, deposit:{egp:0,usd:0,eur:0,gbp:0}, rest:{egp:0,usd:220,eur:0,gbp:0}, supplier:'adel badr', sales:'hatem', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:220,eur:0,gbp:0}, net:10340 },
      { rowIndex:8, date:'02/04/2026', day:'Thursday', trip:'cairo GEM', adults:'5', children:'-', infants:'-', hotel:'reef oasis blue bay', room:'6235', pickup:'23:20', nationality:'pol', price:{egp:0,usd:550,eur:0,gbp:0}, deposit:{egp:0,usd:0,eur:0,gbp:0}, rest:{egp:0,usd:550,eur:0,gbp:0}, supplier:'adel badr', sales:'kabil', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:550,eur:0,gbp:0}, net:25850 },
      { rowIndex:9, date:'02/04/2026', day:'Thursday', trip:'moto', adults:'1dbl+3sgl', children:'-', infants:'-', hotel:'aurora orientel', room:'167', pickup:'14:30', nationality:'pol', price:{egp:0,usd:85,eur:0,gbp:0}, deposit:{egp:0,usd:0,eur:0,gbp:0}, rest:{egp:0,usd:85,eur:0,gbp:0}, supplier:'yasser', sales:'alex', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:85,eur:0,gbp:0}, net:3995 },
      { rowIndex:10, date:'03/04/2026', day:'Friday', trip:'petra', adults:'3', children:'-', infants:'-', hotel:'reef oasis blue bay', room:'6229', pickup:'1:30', nationality:'pol', price:{egp:0,usd:0,eur:615,gbp:0}, deposit:{egp:0,usd:0,eur:310,gbp:0}, rest:{egp:0,usd:0,eur:305,gbp:0}, supplier:'rimon', sales:'aref', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:0,eur:615,gbp:0}, net:33825 },
      { rowIndex:11, date:'03/04/2026', day:'Friday', trip:'ras mohamed', adults:'2', children:'2', infants:'-', hotel:'aqua blue', room:'6321', pickup:'8:00', nationality:'pol', price:{egp:0,usd:0,eur:120,gbp:0}, deposit:{egp:0,usd:0,eur:120,gbp:0}, rest:{egp:0,usd:0,eur:0,gbp:0}, supplier:'butter fly', sales:'alex', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:0,eur:120,gbp:0}, net:6600 },
      { rowIndex:12, date:'04/04/2026', day:'Saturday', trip:'city tour', adults:'6', children:'-', infants:'-', hotel:'parrotel beach', room:'-', pickup:'16:30', nationality:'pol', price:{egp:0,usd:90,eur:0,gbp:0}, deposit:{egp:0,usd:90,eur:0,gbp:0}, rest:{egp:0,usd:0,eur:0,gbp:0}, supplier:'hafez', sales:'kabil', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:90,eur:0,gbp:0}, net:4230 },
      { rowIndex:13, date:'05/04/2026', day:'Sunday', trip:'sinai moses', adults:'5', children:'-', infants:'-', hotel:'grand plaza', room:'3251', pickup:'21:00', nationality:'pol', price:{egp:0,usd:275,eur:0,gbp:0}, deposit:{egp:0,usd:0,eur:0,gbp:0}, rest:{egp:0,usd:275,eur:0,gbp:0}, supplier:'amgad', sales:'kamila', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:275,eur:0,gbp:0}, net:12925 },
      { rowIndex:14, date:'06/04/2026', day:'Monday', trip:'transfer', adults:'2', children:'-', infants:'-', hotel:'naama blue', room:'-', pickup:'12:00', nationality:'eng', price:{egp:9000,usd:0,eur:0,gbp:0}, deposit:{egp:9000,usd:0,eur:0,gbp:0}, rest:{egp:0,usd:0,eur:0,gbp:0}, supplier:'hafez', sales:'saad', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:9000,usd:0,eur:0,gbp:0}, net:9000 },
      { rowIndex:15, date:'11/04/2026', day:'Saturday', trip:'priv boat', adults:'2*2+2', children:'-', infants:'-', hotel:'rixos radamis', room:'2112', pickup:'8:00', nationality:'pol', price:{egp:0,usd:1000,eur:0,gbp:0}, deposit:{egp:0,usd:0,eur:0,gbp:0}, rest:{egp:0,usd:1000,eur:0,gbp:0}, supplier:'butter fly', sales:'mahmoud amin', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:1000,eur:0,gbp:0}, net:47000 },
      { rowIndex:16, date:'14/04/2026', day:'Tuesday', trip:'priv cairo plane', adults:'4', children:'-', infants:'-', hotel:'iberotel palace', room:'-', pickup:'3:15', nationality:'spain', price:{egp:0,usd:1040,eur:0,gbp:0}, deposit:{egp:0,usd:1040,eur:0,gbp:0}, rest:{egp:0,usd:0,eur:0,gbp:0}, supplier:'done', sales:'hafez', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:0,usd:1040,eur:0,gbp:0}, net:48880 },
      { rowIndex:17, date:'20/04/2026', day:'Monday', trip:'buggy+moto+camel+vip dinner', adults:'family+buggy', children:'-', infants:'-', hotel:'parrotel lagoon', room:'4402', pickup:'16:30', nationality:'eng', price:{egp:10290,usd:0,eur:0,gbp:0}, deposit:{egp:10290,usd:0,eur:0,gbp:0}, rest:{egp:0,usd:0,eur:0,gbp:0}, supplier:'yasser', sales:'ahmed cafe', number:'-', notes:'-', cost:{egp:0,usd:0,eur:0,gbp:0}, profit:{egp:10290,usd:0,eur:0,gbp:0}, net:10290 },
    ];

    if (action === 'getMonthData') {
      return { success: true, month: params.month || '04/2026', data: D };
    }
    if (action === 'getDashboardStats') {
      let tot=D.length, revEGP=0,revUSD=0,revEUR=0,revGBP=0,profEGP=0,profUSD=0,profEUR=0,profGBP=0,tNet=0;
      const trips={}, nats={}, sups={}, sl={};
      D.forEach(r => {
        revEGP+=r.price.egp; revUSD+=r.price.usd; revEUR+=r.price.eur; revGBP+=r.price.gbp;
        profEGP+=r.profit.egp; profUSD+=r.profit.usd; profEUR+=r.profit.eur; profGBP+=r.profit.gbp;
        tNet+=r.net;
        const t=r.trip.toLowerCase(); trips[t]=(trips[t]||0)+1;
        if(r.nationality&&r.nationality!=='-') nats[r.nationality]=(nats[r.nationality]||0)+1;
        if(r.supplier&&r.supplier!=='-') sups[r.supplier]=(sups[r.supplier]||0)+1;
        if(r.sales&&r.sales!=='-') sl[r.sales]=(sl[r.sales]||0)+1;
      });
      const s=o=>Object.entries(o).sort((a,b)=>b[1]-a[1]).slice(0,10).map(([name,count])=>({name,count}));
      return { success:true, stats:{ totalBookings:tot, revenue:{egp:revEGP,usd:revUSD,eur:revEUR,gbp:revGBP}, profit:{egp:profEGP,usd:profUSD,eur:profEUR,gbp:profGBP}, totalNetEGP:tNet, topTrips:s(trips), nationalities:s(nats), suppliers:s(sups), sales:s(sl) }};
    }
    return { success: true, message: 'Demo mode - operation simulated' };
  }
};

// ===== Auth System =====
const Auth = {
  PIN: null,
  isLocked: true,

  init() {
    this.PIN = localStorage.getItem('appPin');
    this.isLocked = !!this.PIN;
  },

  setPin(pin) {
    this.PIN = pin;
    localStorage.setItem('appPin', pin);
  },

  verify(pin) {
    return this.PIN === pin;
  },

  hasPin() {
    return !!this.PIN;
  },

  removePin() {
    this.PIN = null;
    localStorage.removeItem('appPin');
    this.isLocked = false;
  }
};

API.init();
Auth.init();
