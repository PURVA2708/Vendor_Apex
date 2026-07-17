/* ================= ANIMATION ENGINE ================= */
function reveal(scope){
  (scope||document).querySelectorAll('.rv').forEach((el,i)=>{
    el.classList.remove('in'); void el.offsetWidth;
    if(!el.style.getPropertyValue('--d')) el.style.setProperty('--d',(i*55)+'ms');
    el.classList.add('in');
  });
}
function countUp(scope){
  (scope||document).querySelectorAll('[data-cu]').forEach(el=>{
    const target=parseFloat(el.dataset.cu), dec=+(el.dataset.dec||0), pre=el.dataset.pre||'', t0=performance.now(), dur=950;
    function tick(t){ const p=Math.min((t-t0)/dur,1), e=1-Math.pow(1-p,3);
      el.textContent=pre+(target*e).toLocaleString('en-IN',{minimumFractionDigits:dec,maximumFractionDigits:dec});
      if(p<1) requestAnimationFrame(tick); }
    requestAnimationFrame(tick);
  });
}
function growBars(scope){
  (scope||document).querySelectorAll('.bar[data-h]').forEach((b,i)=>{
    setTimeout(()=>{ b.style.height=b.dataset.h+'%'; }, 120+i*80);
  });
}
function sweepDonut(el,segs,total){
  const t0=performance.now(), dur=1100;
  function tick(t){ const p=Math.min((t-t0)/dur,1), e=1-Math.pow(1-p,3);
    let acc=0; const g=segs.map(s=>{const a0=acc/total*360*e;acc+=s.c;const a1=acc/total*360*e;return `${s.col} ${a0}deg ${a1}deg`;}).join(',');
    el.style.background=`conic-gradient(${g}, var(--grey-soft) ${360*e}deg)`;
    if(p<1) requestAnimationFrame(tick); }
  requestAnimationFrame(tick);
}

/* ================= AUTH ================= */
function authTab(which){
  $('tabLogin').classList.toggle('on',which==='login');
  $('tabSignup').classList.toggle('on',which==='signup');
  $('authInd').style.left = which==='login'?'0':'50%';
  authView(which);
}
function authView(v){
  document.querySelectorAll('.au-view').forEach(x=>x.classList.remove('on'));
  const el=$('v-'+v); if(!el) return;
  el.classList.add('on');
  if(v==='forgot') fpStep(1);
  reveal(el);
}
function togglePw(id,btn){ const i=$(id); i.type=i.type==='password'?'text':'password'; btn.textContent=i.type==='password'?'SHOW':'HIDE'; }
function setErr(fid,on,msg){ const f=$(fid); if(!f)return; f.classList.toggle('err',!!on); if(msg){const e=f.querySelector('.err-t'); if(e)e.textContent=msg;} }
const emailOk = e => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

// API is now defined globally in index.html


function btnLoad(id, loading, label){
  const b=$(id); if(!b) return;
  b.disabled = loading;
  b.innerHTML = loading ? '<span style="opacity:.6">Please wait…</span>' : label;
}
function shakeCard(){ const c=document.querySelector('.au-card'); if(!c)return; c.classList.remove('shake'); void c.offsetWidth; c.classList.add('shake'); }

// ── Fill demo credentials ───────────────────────────────────────────────────
function fillDemo(role){
  const demos = {
    officer:{ email:'officer@vb.com', pass:'officer123', label:'Officer' },
    manager:{ email:'manager@vb.com', pass:'manager123', label:'Manager' },
    vendor: { email:'v1@vendor.com',  pass:'vendor123',  label:'Vendor'  },
    admin:  { email:'admin@vb.com',   pass:'admin123',   label:'Admin'   },
  };
  const d = demos[role]; if(!d) return;
  $('l_email').value = d.email; $('l_pass').value = d.pass;
  setErr('f_lemail',0); setErr('f_lpass',0);
  toast(`Filled ${d.label} credentials — hit Sign in`);
}

// ── LOGIN  (email + password) ────────────────────────────────────────────────
async function doLogin(){
  const em = $('l_email').value.trim().toLowerCase(), pw = $('l_pass').value;
  let bad = false;
  if(!emailOk(em)){ setErr('f_lemail',1,'ENTER A VALID EMAIL'); bad=true; } else setErr('f_lemail',0);
  if(!pw){ setErr('f_lpass',1,'ENTER YOUR PASSWORD'); bad=true; } else setErr('f_lpass',0);
  if(bad){ shakeCard(); return; }

  btnLoad('btnLogin', true, 'Signing in…');
  try {
    const r = await fetch(`${API}/auth/login`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email:em, password:pw })
    });
    const d = await r.json();
    if(!r.ok){
      if(d.error==='NO_ACCOUNT')  { setErr('f_lemail',1,'NO ACCOUNT WITH THIS EMAIL'); }
      else if(d.error==='WRONG_PASSWORD') { setErr('f_lpass',1,'WRONG PASSWORD'); }
      else { setErr('f_lpass',1, d.message||'Sign-in failed'); }
      shakeCard();
    } else {
      localStorage.setItem('vb_token', d.token);
      enterApp(d.user);
    }
  } catch(e){
    setErr('f_lpass',1,'Could not reach server — is the API running?'); shakeCard();
  } finally {
    btnLoad('btnLogin', false, 'Sign in <span class="ar">›</span>');
  }
}

// ── SIGNUP ──────────────────────────────────────────────────────────────────
async function doSignup(){
  const name=$('s_name').value.trim(), em=$('s_email').value.trim().toLowerCase(),
        pw=$('s_pass').value, pw2=$('s_pass2').value, role=$('s_role').value;
  let bad=false;
  setErr('f_sname',!name); bad=bad||!name;
  if(!emailOk(em)){ setErr('f_semail',1,'ENTER A VALID EMAIL'); bad=true; } else setErr('f_semail',0);
  if(pw.length<6){ setErr('f_spass',1); bad=true; } else setErr('f_spass',0);
  if(pw2!==pw){ setErr('f_spass2',1); bad=true; } else setErr('f_spass2',0);
  let gst=null;
  if(role==='vendor'){
    gst=$('s_gst').value.trim().toUpperCase();
    const gstOk=/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst);
    setErr('f_sgst',!gstOk); bad=bad||!gstOk;
  }
  if(bad){ shakeCard(); return; }

  btnLoad('btnSignup', true, 'Creating account…');
  try {
    const r = await fetch(`${API}/auth/signup`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ name, email:em, password:pw, role, gst })
    });
    const d = await r.json();
    if(!r.ok){
      const msg = d.error==='EMAIL_TAKEN' ? 'EMAIL ALREADY REGISTERED' : (d.message||d.error||'Signup failed');
      setErr('f_semail',1,msg); shakeCard();
    } else {
      toast('Account created ✓ — please log in to continue!');
      
      // Clear signup form
      $('s_name').value = ''; $('s_email').value = ''; 
      $('s_pass').value = ''; $('s_pass2').value = '';
      if($('s_gst')) $('s_gst').value = '';
      
      // Pre-fill login email for convenience
      $('l_email').value = em;
      
      // Redirect to login tab
      setTimeout(()=>authTab('login'), 800);
    }
  } catch(e){
    setErr('f_semail',1,'Could not reach server — is the API running?'); shakeCard();
  } finally {
    btnLoad('btnSignup', false, 'Create account <span class="ar">›</span>');
  }
}

// ── FORGOT PASSWORD  — 3-step ───────────────────────────────────────────────
let _fpEmail = '';

function fpStep(n){
  ['fstep1','fstep2','fstep3','fstepOk'].forEach((id,i)=>{
    const el=$(id); if(!el) return;
    el.style.display = (i+1===n || (n===4 && id==='fstepOk')) ? 'block' : 'none';
  });
  [1,2,3].forEach(i=>{ const el=$('fd'+i); if(el) el.classList.toggle('on', i<=Math.min(n,3)); });
}

// Step 1 — send OTP to email
async function fpSend(){
  const em = $('fp_email').value.trim().toLowerCase();
  if(!emailOk(em)){ setErr('f_femail',1,'ENTER A VALID EMAIL'); return; }
  setErr('f_femail',0);
  btnLoad('btnFpSend', true, 'Sending…');
  try {
    const r = await fetch(`${API}/auth/forgot/send`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: em })
    });
    const d = await r.json();
    if(!r.ok){
      setErr('f_femail',1, d.error==='NO_ACCOUNT' ? 'NO ACCOUNT WITH THIS EMAIL' : (d.message||'Failed to send'));
    } else {
      _fpEmail = em;
      $('fpEmailShow').textContent = em;
      clearFpBoxes(); fpStep(2);
      toast('Reset code sent — check your email ✉');
    }
  } catch(e){
    setErr('f_femail',1,'Could not reach server'); shakeCard();
  } finally {
    btnLoad('btnFpSend', false, 'Send reset code <span class="ar">›</span>');
  }
}

// Step 1 — resend OTP
async function fpResend(){
  if(!_fpEmail) return;
  const el=$('fpResend'); if(el){ el.style.opacity='.4'; el.style.pointerEvents='none'; }
  await fetch(`${API}/auth/forgot/send`,{ method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({email:_fpEmail}) }).catch(()=>{});
  toast('Code resent — check your inbox ✉'); clearFpBoxes();
  setTimeout(()=>{ if(el){ el.style.opacity=''; el.style.pointerEvents=''; } }, 30000);
}

// Step 2 — verify OTP
async function fpVerify(){
  const otp = [0,1,2,3,4,5].map(i=>$('fp'+i)?.value||'').join('');
  if(otp.length<6){ setErr('f_fcode',1,'ENTER ALL 6 DIGITS'); return; }
  setErr('f_fcode',0);
  btnLoad('btnFpVerify', true, 'Verifying…');
  try {
    const r = await fetch(`${API}/auth/forgot/verify`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: _fpEmail, otp })
    });
    const d = await r.json();
    if(!r.ok){
      setErr('f_fcode',1, d.error==='EXPIRED' ? 'CODE EXPIRED — REQUEST A NEW ONE' : 'INCORRECT CODE — CHECK YOUR EMAIL');
    } else {
      fpStep(3);
    }
  } catch(e){
    setErr('f_fcode',1,'Could not reach server');
  } finally {
    btnLoad('btnFpVerify', false, 'Verify code <span class="ar">›</span>');
  }
}

// Step 3 — set new password
async function fpReset(){
  const pw=$('fp_new').value, pw2=$('fp_new2').value;
  if(pw.length<6){ setErr('f_fnew',1); return; } else setErr('f_fnew',0);
  if(pw2!==pw){ setErr('f_fnew2',1); return; } else setErr('f_fnew2',0);
  btnLoad('btnFpReset', true, 'Updating…');
  try {
    const r = await fetch(`${API}/auth/forgot/reset`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ email: _fpEmail, newPassword: pw })
    });
    const d = await r.json();
    if(!r.ok){
      setErr('f_fnew',1, d.error==='SESSION_EXPIRED' ? 'SESSION EXPIRED — START OVER' : (d.message||'Update failed'));
      if(d.error==='SESSION_EXPIRED') fpStep(1);
    } else {
      fpStep(4);
      toast('Password updated ✓ — confirmation email sent!');
    }
  } catch(e){
    setErr('f_fnew',1,'Could not reach server');
  } finally {
    btnLoad('btnFpReset', false, 'Update password <span class="ar">›</span>');
  }
}

// ── OTP box helpers ────────────────────────────────────────────────────────
// prefix: 'otp' (future use) or 'fp' (forgot password)
function cNext(inp, prefix, i){
  // Handle old 2-arg calls: cNext(inp, index)
  if(typeof prefix === 'number'){ i=prefix; prefix='otp'; }
  inp.value = inp.value.replace(/[^0-9]/g,'');
  if(inp.value && i<5) $(prefix+''+(i+1))?.focus();
}
function cPrev(e,i){
  if(e.key==='Backspace' && !e.target.value && i>0) $('otp'+(i-1))?.focus();
}
function cPrevFp(e,i){
  if(e.key==='Backspace' && !e.target.value && i>0) $('fp'+(i-1))?.focus();
}
function clearFpBoxes(){
  [0,1,2,3,4,5].forEach(i=>{ const el=$('fp'+i); if(el) el.value=''; });
  setErr('f_fcode',0);
  setTimeout(()=>$('fp0')?.focus(),200);
}

// ── Warmup ping — fires silently on boot to wake Render from cold sleep ────
(function warmup(){
  fetch(`${API}/health`, { method:'GET' }).catch(()=>{});
})();

// ── Session restore on page load ───────────────────────────────────────────
async function restoreSession(){
  const token = localStorage.getItem('vb_token');
  if(!token) return;
  try {
    const r = await fetch(`${API}/auth/me`,{ headers:{'Authorization':'Bearer '+token} });
    if(r.ok){ const d=await r.json(); enterApp(d.user); }
    else { localStorage.removeItem('vb_token'); }
  } catch(e){ /* server offline — stay on login */ }
}

// ── Loading overlay helpers ────────────────────────────────────────────────
function showDbLoader(){
  let ov=$('db-loader');
  if(!ov){
    ov=document.createElement('div'); ov.id='db-loader';
    ov.style.cssText='position:fixed;inset:0;background:rgba(247,246,242,0.82);backdrop-filter:blur(6px);z-index:9999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:18px;pointer-events:none';
    ov.innerHTML=`
      <div style="width:44px;height:44px;border:3px solid #E7E5DE;border-top-color:#121212;border-radius:50%;animation:dbspin .7s linear infinite"></div>
      <div style="font-size:13px;font-weight:700;letter-spacing:.08em;color:#71706A">LOADING LIVE DATA…</div>
      <style>@keyframes dbspin{to{transform:rotate(360deg)}}</style>`;
    document.body.appendChild(ov);
  }
  ov.style.opacity='1'; ov.style.pointerEvents='none';
}
function hideDbLoader(){
  const ov=$('db-loader'); if(!ov) return;
  ov.style.transition='opacity .35s'; ov.style.opacity='0';
  setTimeout(()=>ov.remove(), 380);
}

// ── Enter app ──────────────────────────────────────────────────────────────
function enterApp(user){
  const acc = {
    id: user.id, email: user.email, name: user.name,
    role: user.role, label: user.label,
    vendorId: user.vendorId || null, pass: null,
  };
  S.user = acc;
  $('auth').style.display='none';
  $('app').classList.add('on');
  $('uName').textContent=acc.name; $('uRole').textContent=acc.label.toUpperCase();
  $('roleChip').textContent=acc.label.toUpperCase();
  const av=$('uAvatar'); av.textContent=acc.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
  av.style.background=ROLECOLOR[acc.role];
  buildNav(); go('dashboard'); renderNotifs();
  toast(`Signed in as ${acc.name} — ${acc.label}`);
  // Merge real DB data in background — show spinner, keep UI instant on demo data
  showDbLoader();
  loadState()
    .then(() => { buildNav(); go('dashboard'); renderNotifs(); })
    .catch(()=>{})
    .finally(()=> hideDbLoader());
}

// ── Logout ─────────────────────────────────────────────────────────────────
function logout(){
  localStorage.removeItem('vb_token');
  $('app').classList.remove('on'); $('auth').style.display='grid';
  $('l_email').value=''; $('l_pass').value=''; authTab('login');
  reveal($('auth')); countUp($('auth'));
}

/* ================= NAV / SHELL ================= */
const IC = {
  dash:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>',
  vend:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 21h18M5 21V7l7-4 7 4v14M9 9h.01M9 13h.01M15 9h.01M15 13h.01M10 21v-4h4v4"/></svg>',
  rfq:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h4"/></svg>',
  quote:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1v22M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
  appr:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.1V12a10 10 0 1 1-5.9-9.1"/><path d="M22 4 12 14l-3-3"/></svg>',
  po:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 8a2 2 0 0 0-1-1.7l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.7l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.7z"/><path d="m3.3 7 8.7 5 8.7-5M12 22V12"/></svg>',
  log:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>',
  rep:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 3v18h18M7 16v-5M12 16V8M17 16v-3"/></svg>',
  user:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M23 21v-2a4 4 0 0 0-3-3.9M16 3.1a4 4 0 0 1 0 7.8"/><circle cx="9" cy="7" r="4"/></svg>'
};
const NAVS = {
  officer:[['Workspace'],['dashboard','Dashboard',IC.dash],['rfqs','RFQs',IC.rfq],['rfq-create','Create RFQ',IC.quote],['vendors','Vendors',IC.vend],['Procure'],['pos','POs & Invoices',IC.po],['Insight'],['logs','Activity Logs',IC.log],['reports','Reports',IC.rep]],
  manager:[['Workspace'],['dashboard','Dashboard',IC.dash],['approvals','Approvals',IC.appr,'pend'],['rfqs','RFQs',IC.rfq],['Insight'],['logs','Activity Logs',IC.log],['reports','Reports',IC.rep]],
  vendor:[['Workspace'],['dashboard','Dashboard',IC.dash],['vendor-rfqs','My RFQ Invites',IC.rfq],['pos','My POs',IC.po],['Insight'],['logs','Activity',IC.log]],
  admin:[['Workspace'],['dashboard','Dashboard',IC.dash],['users','Users',IC.user],['vendors','Vendors',IC.vend],['rfqs','RFQs',IC.rfq],['Insight'],['logs','Audit Logs',IC.log],['reports','Analytics',IC.rep]],
};
function buildNav(){
  const el=$('sbnav'); el.innerHTML='';
  NAVS[S.user.role].forEach(n=>{
    if(n.length===1){ el.innerHTML+=`<div class="sb-sec">${n[0]}</div>`; return; }
    const pendPill = n[3]==='pend' && S.pending.length ? `<span class="pill">${S.pending.length}</span>` : '';
    el.innerHTML+=`<button class="nav-item" data-pg="${n[0]}" onclick="go('${n[0]}')">${n[2]}${n[1]}${pendPill}</button>`;
  });
}
function go(pg){
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('on'));
  const page=$('pg-'+pg); page.classList.add('on');
  document.querySelectorAll('.nav-item').forEach(b=>b.classList.toggle('active',b.dataset.pg===pg));
  $('crumb').innerHTML='vendorbridge / <b>'+pg.replace(/-/g,' ')+'</b>';
  $('content').scrollTop=0;
  
  // Close mobile sidebar if open
  if($('sidebar')){ $('sidebar').classList.remove('open'); }
  if($('sbScrim')){ $('sbScrim').classList.remove('on'); }
  
  const r={dashboard:rDash,vendors:rVendors,rfqs:rRfqs,'rfq-create':rRfqCreate,'vendor-rfqs':rVendorRfqs,quote:rQuote,compare:rCompare,approvals:rApprovals,'approval-detail':rApprovalDetail,pos:rPos,invoice:rInvoice,logs:rLogs,reports:rReports,users:rUsers}[pg];
  if(r) r();
  reveal(page); countUp(page); growBars(page);
}

function toggleSidebar() {
  const sb = $('sidebar'), scrim = $('sbScrim');
  if(!sb || !scrim) return;
  const isOpen = sb.classList.contains('open');
  if (isOpen) {
    sb.classList.remove('open');
    scrim.classList.remove('on');
  } else {
    sb.classList.add('open');
    scrim.classList.add('on');
  }
}
function toast(msg,err){ const t=document.createElement('div'); t.className='toast'+(err?' err':''); t.innerHTML=`<i></i>${msg}`;
  $('toasts').appendChild(t); setTimeout(()=>{t.style.transition='.4s';t.style.opacity='0';t.style.transform='translateY(8px)';setTimeout(()=>t.remove(),400)},3400); }
function log(who,what,c){ S.logs.unshift({who,what,min:0,c:c||'#121212'}); }
function notify(t){ S.notifs.unshift({t,min:0}); renderNotifs(); }
function renderNotifs(){ $('notifCount').textContent=S.notifs.length;
  $('notifList').innerHTML=S.notifs.slice(0,6).map(n=>`<div class="n-item"><i class="n-dot"></i><div>${n.t}<span>${ago(n.min)}</span></div></div>`).join(''); }
function toggleNotif(e){ e.stopPropagation(); $('notifPop').classList.toggle('on'); }
document.addEventListener('click',()=>$('notifPop')&&$('notifPop').classList.remove('on'));
function closeModal(id){ $(id).classList.remove('on'); }
const phead=(no,kick,title,sub,right)=>`<div class="ph rv"><div class="ph-row"><div>
  <div class="kicker"><b>${no}</b> · ${kick}</div><h2>${title}</h2>${sub?`<div class="sub">${sub}</div>`:''}</div>
  ${right?`<div class="right">${right}</div>`:''}</div></div>`;

/* ================= DASHBOARD ================= */
const stat=(k,v,s,dot,red,dec,pre)=>`<div class="stat rv"><div class="k" style="--dot:${dot}"><i></i>${k}</div>
  <div class="v ${red?'red':''}" ${typeof v==='number'?`data-cu="${v}" data-dec="${dec||0}" data-pre="${pre||''}"`:''}>${typeof v==='number'?'0':v}</div><div class="s">${s}</div></div>`;
function rDash(){
  const u=S.user, el=$('pg-dashboard');
  const totalSpend=S.invoices.reduce((a,i)=>a+i.total,0);
  let cards='', extra='';
  if(u.role==='vendor'){
    const vid=u.vendorId;
    const invites=S.rfqs.filter(r=>r.vendors.includes(vid)&&r.status!=='DRAFT');
    const myQuotes=S.quotes.filter(q=>q.vendor===vid);
    const myPos=S.pos.filter(p=>p.vendor===vid);
    cards=stat('OPEN INVITATIONS',invites.filter(r=>['SENT','QUOTED'].includes(r.status)&&!S.quotes.find(q=>q.rfq===r.id&&q.vendor===vid)).length,'awaiting your quote','var(--red)',1)
      +stat('QUOTATIONS SENT',myQuotes.length,myQuotes.filter(q=>q.status==='APPROVED').length+' won','var(--amber)')
      +stat('PURCHASE ORDERS',myPos.length,'from VendorBridge Corp','var(--ink)')
      +stat('RATING',vById(vid)?vById(vid).rating:4.0,'based on past orders','var(--green)',0,1);
    extra=`<div class="card rv"><div class="card-h"><div class="kicker"><b>ACT</b> · NEEDS YOU</div></div><div class="card-b flush">${vendorInviteRows()}</div></div>`;
  } else {
    cards=stat('PENDING APPROVALS',S.pending.length,u.role==='manager'?'waiting for you':'with manager','var(--red)',S.pending.length>0)
      +stat('ACTIVE RFQS',S.rfqs.filter(r=>!['INVOICED','PAID','REJECTED'].includes(r.status)).length,'in pipeline','var(--amber)')
      +stat('PURCHASE ORDERS',S.pos.length,'this quarter','var(--ink)')
      +stat('TOTAL SPEND',totalSpend/100000,'₹ lakh · invoiced value','var(--green)',0,1,'');
    extra=`<div class="grid2">
      <div class="card rv"><div class="card-h"><div><div class="kicker"><b>01</b> · PIPELINE</div><h3 style="margin-top:3px">Recent RFQs</h3></div>
        <div class="right"><a class="link" onclick="go('rfqs')">View all →</a></div></div>
        <div class="card-b flush"><table><thead><tr><th>RFQ</th><th>Status</th><th>Deadline</th></tr></thead><tbody>
        ${S.rfqs.slice(0,4).map(r=>`<tr style="cursor:pointer" onclick="openRfq(${r.id})"><td><span class="mono">RFQ-${r.id}</span><br><span class="t-strong">${r.title}</span></td><td>${badge(r.status)}</td><td class="t-muted mono">${dstr(r.deadline)}</td></tr>`).join('')}
        </tbody></table></div></div>
      <div class="card rv"><div class="card-h"><div><div class="kicker"><b>02</b> · AUDIT</div><h3 style="margin-top:3px">Recent activity</h3></div>
        <div class="right"><a class="link" onclick="go('logs')">Full log →</a></div></div>
        <div class="card-b"><div class="tl">${S.logs.slice(0,5).map(l=>`<div class="tl-item" style="--tc:${l.c}"><b>${l.who}</b><span>${l.what} · ${ago(l.min)}</span></div>`).join('')}</div></div></div>
    </div>`;
  }
  const quick = u.role==='officer'?`<button class="btn btn-dark" onclick="go('rfq-create')">Create RFQ <span class="ar">›</span></button><button class="btn btn-line" onclick="openRfq(1024)">Compare RFQ-1024</button>`
    : u.role==='manager'?`<button class="btn btn-dark" onclick="go('approvals')">Review approvals (${S.pending.length}) <span class="ar">›</span></button>`
    : u.role==='vendor'?`<button class="btn btn-dark" onclick="go('vendor-rfqs')">View invites <span class="ar">›</span></button>`
    : `<button class="btn btn-dark" onclick="openVendorModal()">Register vendor <span class="ar">›</span></button>`;
  el.innerHTML = phead('00','OVERVIEW',`Good day, ${u.name.split(' ')[0]}.`,
    `Here's what's moving in procurement right now.`,quick)
    + `<div class="grid4">${cards}</div>${extra}`;
}

/* ================= VENDORS ================= */
let vFilter={q:'',cat:'all'};
function rVendors(){
  const el=$('pg-vendors');
  const cats=['all',...new Set(S.vendors.map(v=>v.cat))];
  const list=S.vendors.filter(v=>(vFilter.cat==='all'||v.cat===vFilter.cat)&&v.name.toLowerCase().includes(vFilter.q.toLowerCase()));
  el.innerHTML = phead('01','VENDOR REGISTRY','Vendor Management',`${S.vendors.length} suppliers · GST verified`,
    `<button class="btn btn-dark" onclick="openVendorModal()">Register vendor <span class="ar">›</span></button>`)
  + `<div class="card rv"><div class="card-h">
    <div class="search"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
      <input placeholder="Search vendors…" value="${vFilter.q}" oninput="vFilter.q=this.value;rVendors()"></div>
    <select class="bare" onchange="vFilter.cat=this.value;rVendors()">${cats.map(c=>`<option ${c===vFilter.cat?'selected':''}>${c}</option>`).join('')}</select></div>
    <div class="card-b flush"><table><thead><tr><th>Vendor</th><th>Category</th><th>GST</th><th>Contact</th><th>Rating</th><th>Status</th><th></th></tr></thead><tbody>
    ${list.map(v=>`<tr><td><span class="t-strong">${v.name}</span></td><td>${v.cat}</td><td class="mono">${v.gst}</td>
      <td>${v.email}<br><span class="t-muted mono">${v.phone}</span></td><td class="stars">${stars(v.rating)}</td><td>${badge(v.status)}</td>
      <td><button class="btn btn-line btn-sm" onclick="toggleVendor(${v.id})">${v.status==='active'?'Deactivate':'Activate'}</button></td></tr>`).join('')||'<tr><td colspan="7"><div class="empty"><b>No vendors found</b>Try a different search.</div></td></tr>'}
    </tbody></table></div></div>`;
}
function openVendorModal(){ $('vendorModal').classList.add('on'); }
async function saveVendor(){
  const name=vm_name.value.trim(), gst=vm_gst.value.trim().toUpperCase(), email=vm_email.value.trim();
  if(!name||!email) return toast('Company name and email are required',1);
  if(!/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(gst)) return toast('Invalid GST number format (15 chars)',1);
  const newV={id:S.seq.vendor++,name,cat:vm_cat.value,gst,email,phone:vm_phone.value||'—',status:'active',rating:4.0};
  S.vendors.push(newV);
  closeModal('vendorModal'); log(S.user.name,`registered vendor "${name}"`); notify(`Vendor "${name}" registered`);
  toast(`Vendor "${name}" registered ✓`); rVendors(); reveal($('pg-vendors'));
  // Persist to DB in background
  fetch(`${API}/vendors`,{method:'POST',headers:authHeaders(),body:JSON.stringify({name,cat:vm_cat.value,gst,email,phone:vm_phone.value||'—'})}).catch(()=>{});
}
async function toggleVendor(id){
  const v=vById(id); v.status=v.status==='active'?'inactive':'active';
  log(S.user.name,`set vendor "${v.name}" to ${v.status}`); toast(`${v.name} is now ${v.status}`); rVendors();
  // Persist to DB in background
  fetch(`${API}/vendors/${id}/status`,{method:'PUT',headers:authHeaders(),body:JSON.stringify({status:v.status})}).catch(()=>{});
}

/* ================= RFQ LIST / CREATE ================= */
function rRfqs(){
  const el=$('pg-rfqs');
  el.innerHTML = phead('02','PIPELINE','Requests for Quotation',`${S.rfqs.length} RFQs in the system`,
    S.user.role==='officer'?`<button class="btn btn-dark" onclick="go('rfq-create')">Create RFQ <span class="ar">›</span></button>`:'')
  + `<div class="card rv"><div class="card-b flush"><table><thead><tr><th>RFQ</th><th>Items</th><th>Vendors</th><th>Quotes</th><th>Deadline</th><th>Status</th><th></th></tr></thead><tbody>
    ${S.rfqs.map(r=>{const qs=S.quotes.filter(q=>q.rfq===r.id);return `<tr>
      <td><span class="mono">RFQ-${r.id}</span><br><span class="t-strong">${r.title}</span></td>
      <td class="t-muted">${r.items.map(i=>i.name+' × '+i.qty).join('<br>')}</td>
      <td class="t-muted">${r.vendors.map(v=>vById(v)?vById(v).name.split(' ')[0]:'').join(', ')}</td>
      <td class="mono">${qs.length}/${r.vendors.length}</td>
      <td class="t-muted mono">${dstr(r.deadline)}</td><td>${badge(r.status)}</td>
      <td>${rfqAction(r)}</td></tr>`;}).join('')}
    </tbody></table></div></div>`;
}
function rfqAction(r){
  const qs=S.quotes.filter(q=>q.rfq===r.id);
  if(S.user.role==='officer'){
    if(r.status==='QUOTED'&&qs.length) return `<button class="btn btn-dark btn-sm" onclick="openRfq(${r.id})">Compare ${qs.length} <span class="ar">›</span></button>`;
    if(r.status==='PO_CREATED'||r.status==='INVOICED') return `<button class="btn btn-line btn-sm" onclick="go('pos')">View PO</button>`;
    if(r.status==='UNDER_APPROVAL') return `<span class="t-muted mono">WITH MANAGER…</span>`;
    if(r.status==='REJECTED') return `<button class="btn btn-line btn-sm" onclick="openRfq(${r.id})">Review & resend</button>`;
    return `<span class="t-muted mono">AWAITING QUOTES</span>`;
  }
  if(qs.length) return `<button class="btn btn-line btn-sm" onclick="openRfq(${r.id})">View quotes</button>`;
  return '';
}
function openRfq(id){ S.cur.rfq=id; go('compare'); }

let rfqItems=[{name:'',qty:'',unit:'pcs'}], rfqVendorsSel=new Set();
function rRfqCreate(){
  const el=$('pg-rfq-create');
  el.innerHTML = phead('03','NEW REQUEST','Create RFQ','Describe what you need, then pick who can quote.')
  + `<div class="card rv" style="max-width:880px"><div class="card-b">
    <div class="frow">
      <div class="field"><label>RFQ title *</label><input id="rf_title" placeholder="e.g. 50 Office Chairs — Ergonomic"></div>
      <div class="field"><label>Deadline *</label><input id="rf_deadline" type="date" min="${new Date().toISOString().split('T')[0]}"></div>
    </div>
    <div class="field"><label>Description</label><textarea id="rf_desc" rows="2" placeholder="Specs, delivery location, terms…"></textarea></div>
    <div class="field"><label>Items *</label>
      <table class="items-tbl"><thead><tr><th style="width:50%">Item / service</th><th>Quantity</th><th>Unit</th><th></th></tr></thead>
      <tbody id="rf_items"></tbody></table>
      <button class="btn btn-line btn-sm" style="margin-top:12px" onclick="rfqItems.push({name:'',qty:'',unit:'pcs'});drawItems()">+ Add item row</button></div>
    <div class="field"><label>Attachment</label>
      <label class="attach">📎 <span id="rf_attach">Attach spec file (simulated)</span>
      <input type="file" style="display:none" onchange="$('rf_attach').textContent=this.files[0]?.name||'Attach spec file'"></label></div>
    <div class="field"><label>Invite vendors * <span style="text-transform:none;letter-spacing:0">— ${S.vendors.filter(v=>v.status==='active').length} active</span></label>
      <div class="vchecks" id="rf_vendors"></div></div>
    <div style="display:flex;gap:10px;margin-top:8px">
      <button class="btn btn-dark" onclick="createRfq(false)">Send to vendors <span class="ar">›</span></button>
      <button class="btn btn-line" onclick="createRfq(true)">Save as draft</button></div>
  </div></div>`;
  drawItems(); drawVendorChecks();
}
function drawItems(){
  $('rf_items').innerHTML=rfqItems.map((it,i)=>`<tr>
    <td><input value="${it.name}" placeholder="Ergonomic Mesh Chair" oninput="rfqItems[${i}].name=this.value"></td>
    <td><input type="number" value="${it.qty}" placeholder="50" oninput="rfqItems[${i}].qty=this.value"></td>
    <td><input value="${it.unit}" oninput="rfqItems[${i}].unit=this.value"></td>
    <td>${rfqItems.length>1?`<button class="del-row" onclick="rfqItems.splice(${i},1);drawItems()">×</button>`:''}</td></tr>`).join('');
}
function drawVendorChecks(){
  $('rf_vendors').innerHTML=S.vendors.filter(v=>v.status==='active').map(v=>`
    <label class="vcheck ${rfqVendorsSel.has(v.id)?'sel':''}">
    <input type="checkbox" ${rfqVendorsSel.has(v.id)?'checked':''} onchange="this.checked?rfqVendorsSel.add(${v.id}):rfqVendorsSel.delete(${v.id});drawVendorChecks()">
    <div><b>${v.name}</b><span>${v.cat.toUpperCase()} · ${v.rating} ★</span></div></label>`).join('');
}
async function createRfq(draft){
  const title=rf_title.value.trim(), dl=rf_deadline.value;
  const items=rfqItems.filter(i=>i.name&&i.qty>0).map(i=>({name:i.name,qty:+i.qty,unit:i.unit}));
  if(!title) return toast('Give the RFQ a title',1);
  if(!items.length) return toast('Add at least one item with quantity',1);
  if(!draft&&!dl) return toast('Pick a deadline',1);
  if(!draft&&rfqVendorsSel.size===0) return toast('Invite at least one vendor',1);
  const id=S.seq.rfq++;
  const rfqObj={id,title,desc:rf_desc.value,deadline:dl?new Date(dl):addDays(7),status:draft?'DRAFT':'SENT',
    createdBy:S.user.name,created:new Date(),items,vendors:[...rfqVendorsSel],attach:null,selectedQuote:null};
  S.rfqs.unshift(rfqObj);
  log(S.user.name,`created RFQ #RFQ-${id} "${title}"${draft?' (draft)':''}`);
  if(!draft) notify(`RFQ-${id} sent to ${rfqVendorsSel.size} vendor(s)`);
  toast(draft?`RFQ-${id} saved as draft`:`RFQ-${id} sent to ${rfqVendorsSel.size} vendors ✓`);
  rfqItems=[{name:'',qty:'',unit:'pcs'}]; rfqVendorsSel=new Set();
  go('rfqs');
  // Persist to DB in background
  if(!draft) fetch(`${API}/rfqs`,{method:'POST',headers:authHeaders(),body:JSON.stringify({title,desc:rf_desc.value,deadline:dl,items,vendors:[...rfqObj.vendors]})}).catch(()=>{});
}

/* ================= VENDOR PORTAL ================= */
function vendorInviteRows(){
  const vid=S.user.vendorId;
  const rows=S.rfqs.filter(r=>r.vendors.includes(vid)&&r.status!=='DRAFT').map(r=>{
    const mine=S.quotes.find(q=>q.rfq===r.id&&q.vendor===vid);
    const past=new Date(r.deadline)<today;
    let act;
    if(mine&&mine.status==='APPROVED') act=`<span class="badge b-green">Won</span>`;
    else if(mine) act=past?`<span class="t-muted mono">LOCKED</span>`:`<button class="btn btn-line btn-sm" onclick="openQuote(${r.id})">Edit quotation</button>`;
    else act=past?`<span class="t-muted mono">DEADLINE PASSED</span>`:`<button class="btn btn-dark btn-sm" onclick="openQuote(${r.id})">Submit quote <span class="ar">›</span></button>`;
    return `<tr><td><span class="mono">RFQ-${r.id}</span><br><span class="t-strong">${r.title}</span></td>
      <td class="t-muted">${r.items.map(i=>i.name+' × '+i.qty).join('<br>')}</td>
      <td class="t-muted mono">${dstr(r.deadline)}</td>
      <td>${mine?badge(mine.status):'<span class="badge b-grey">Not quoted</span>'}</td><td>${act}</td></tr>`;
  }).join('');
  return `<table><thead><tr><th>RFQ</th><th>Items</th><th>Deadline</th><th>My quote</th><th></th></tr></thead><tbody>${rows||'<tr><td colspan="5"><div class="empty"><b>No invitations yet</b></div></td></tr>'}</tbody></table>`;
}
function rVendorRfqs(){ $('pg-vendor-rfqs').innerHTML = phead('02','SUPPLIER PORTAL','My RFQ Invites','Quote before the deadline — edits are open until then.')
  + `<div class="card rv"><div class="card-b flush">${vendorInviteRows()}</div></div>`; }

function openQuote(rfqId){ S.cur.rfq=rfqId; go('quote'); }
function rQuote(){
  const r=S.rfqs.find(x=>x.id===S.cur.rfq), vid=S.user.vendorId;
  const mine=S.quotes.find(q=>q.rfq===r.id&&q.vendor===vid);
  $('pg-quote').innerHTML=`<a class="back" onclick="go('vendor-rfqs')">← Back to invites</a>`
  + phead('02','SUPPLIER PORTAL',(mine?'Edit':'Submit')+' quotation',`<span class="mono">RFQ-${r.id}</span> · ${r.title} · deadline <b>${dstr(r.deadline)}</b>`)
  + `<div class="card rv" style="max-width:840px"><div class="card-b">
    ${r.desc?`<p class="t-muted" style="margin-bottom:18px">${r.desc}</p>`:''}
    <table class="items-tbl"><thead><tr><th>Item</th><th>Qty</th><th>Your unit price (₹)</th><th style="text-align:right">Line total</th></tr></thead><tbody>
    ${r.items.map((it,i)=>{const pv=mine?mine.items[i].price:'';return `<tr><td class="t-strong">${it.name}</td><td class="mono">${it.qty} ${it.unit}</td>
      <td><input type="number" id="qp_${i}" value="${pv}" placeholder="0" oninput="calcQuote()"></td>
      <td style="text-align:right" class="mono" id="ql_${i}">—</td></tr>`}).join('')}
    </tbody></table>
    <div style="display:flex;justify-content:flex-end;align-items:baseline;gap:12px;padding:16px 6px 6px">
      <span class="kicker">GRAND TOTAL</span><span id="q_total" style="font-size:25px;font-weight:800;letter-spacing:-.03em;color:var(--red)">₹0</span></div>
    <div class="frow">
      <div class="field"><label>Delivery (days) *</label><input type="number" id="q_days" value="${mine?mine.days:''}" placeholder="e.g. 12"></div>
      <div class="field"><label>Notes</label><input id="q_notes" value="${mine?mine.notes:''}" placeholder="Warranty, freight, payment terms…"></div></div>
    <button class="btn btn-dark" onclick="submitQuote(${mine?mine.id:0})">${mine?'Update quotation':'Submit quotation'} <span class="ar">›</span></button>
  </div></div>`;
  calcQuote();
}
function calcQuote(){
  const r=S.rfqs.find(x=>x.id===S.cur.rfq); let tot=0;
  r.items.forEach((it,i)=>{const p=+$('qp_'+i).value||0;const lt=p*it.qty;tot+=lt;
    $('ql_'+i).textContent=lt?fmt(lt):'—';});
  $('q_total').textContent=fmt(tot);
}
async function submitQuote(editId){
  const r=S.rfqs.find(x=>x.id===S.cur.rfq), vid=S.user.vendorId;
  const items=r.items.map((it,i)=>({name:it.name,price:+$('qp_'+i).value||0,qty:it.qty}));
  if(items.some(i=>i.price<=0)) return toast('Enter a price for every item',1);
  const days=+q_days.value; if(!days) return toast('Enter delivery days',1);
  if(editId){ const q=S.quotes.find(x=>x.id===editId); q.items=items;q.days=days;q.notes=q_notes.value;
    log(S.user.name,`updated quotation for RFQ-${r.id} (${fmt(qTotal(q))})`,'#B45309'); toast('Quotation updated ✓');
    fetch(`${API}/quotes/${editId}`,{method:'PUT',headers:authHeaders(),body:JSON.stringify({days,notes:q_notes.value,items})}).catch(()=>{});
  }
  else{ const q={id:S.seq.quote++,rfq:r.id,vendor:vid,items,days,notes:q_notes.value,status:'SUBMITTED',at:new Date()};
    S.quotes.push(q); if(r.status==='SENT')r.status='QUOTED';
    log(S.user.name,`submitted quotation for RFQ-${r.id} (${fmt(qTotal(q))})`,'#B45309');
    notify(`New quotation on RFQ-${r.id} from ${vById(vid)?vById(vid).name:S.user.name}`); toast('Quotation submitted ✓');
    fetch(`${API}/quotes`,{method:'POST',headers:authHeaders(),body:JSON.stringify({rfq:r.id,days,notes:q_notes.value,items})}).catch(()=>{});
  }
  go('vendor-rfqs');
}

/* ================= COMPARISON ================= */
let cmpSort='price';
function rCompare(){
  const r=S.rfqs.find(x=>x.id===S.cur.rfq);
  let qs=S.quotes.filter(q=>q.rfq===r.id);
  if(cmpSort==='price') qs=[...qs].sort((a,b)=>qTotal(a)-qTotal(b));
  if(cmpSort==='days') qs=[...qs].sort((a,b)=>a.days-b.days);
  if(cmpSort==='rating') qs=[...qs].sort((a,b)=>(vById(b.vendor)?.rating||0)-(vById(a.vendor)?.rating||0));
  const minP=qs.length?Math.min(...qs.map(qTotal)):0;
  const minD=qs.length?Math.min(...qs.map(q=>q.days)):0;
  const canSelect = S.user.role==='officer' && ['QUOTED','REJECTED','SENT'].includes(r.status);
  $('pg-compare').innerHTML=`<a class="back" onclick="go('rfqs')">← Back to RFQs</a>`
  + phead('04','SIDE BY SIDE',r.title,
    `<span class="mono">RFQ-${r.id}</span> · ${r.items.map(i=>i.name+' × '+i.qty+' '+i.unit).join(' · ')} · deadline ${dstr(r.deadline)} &nbsp; ${badge(r.status)}`,
    `<select class="bare" onchange="cmpSort=this.value;rCompare();reveal($('pg-compare'))">
      <option value="price" ${cmpSort==='price'?'selected':''}>Sort: lowest price</option>
      <option value="days" ${cmpSort==='days'?'selected':''}>Sort: fastest delivery</option>
      <option value="rating" ${cmpSort==='rating'?'selected':''}>Sort: best rating</option></select>`)
  + (qs.length?`<div class="compare-wrap">${qs.map((q,qi)=>{
      const v=vById(q.vendor), t=qTotal(q), best=t===minP;
      return `<div class="qcard rv ${best?'best':''}" style="--d:${qi*90}ms">
        <div class="qc-h"><b>${v?v.name:'Vendor'}</b><div class="stars" style="margin-top:4px">${v?stars(v.rating):''}</div></div>
        <div class="qc-price"><div class="k">TOTAL QUOTE</div>
          <div class="amt ${best?'low':''}" data-cu="${t}" data-pre="₹">₹0</div></div>
        <div class="qc-rows">
          ${q.items.map(i=>`<div><span>${i.name} (${fmt(i.price)} × ${i.qty})</span><b>${fmt(i.price*i.qty)}</b></div>`).join('')}
          <div><span>Delivery</span><b>${q.days} days ${q.days===minD?'<span class="red">⚡ fastest</span>':''}</b></div>
          <div><span>Submitted</span><b class="mono">${dstr(q.at)}</b></div>
          ${q.notes?`<div><span>Notes</span><b style="max-width:62%">${q.notes}</b></div>`:''}
        </div>
        <div class="qc-f">${q.status==='SELECTED'?'<span class="badge b-amber">Sent for approval</span>'
          :q.status==='APPROVED'?'<span class="badge b-green">Approved</span>'
          :canSelect?`<button class="btn ${best?'btn-dark':'btn-line'}" style="width:100%;justify-content:center" onclick="selectQuote(${q.id})">Select & send for approval <span class="ar">›</span></button>`:''}</div>
      </div>`;}).join('')}</div>`
    :`<div class="card rv"><div class="empty"><b>No quotations yet</b>Invited: ${r.vendors.map(v=>vById(v)?vById(v).name:'').join(', ')}.</div></div>`);
}
async function selectQuote(qid){
  const q=S.quotes.find(x=>x.id===qid), r=S.rfqs.find(x=>x.id===q.rfq), v=vById(q.vendor);
  S.quotes.filter(x=>x.rfq===r.id&&x.status==='SELECTED').forEach(x=>x.status='SUBMITTED');
  q.status='SELECTED'; r.status='UNDER_APPROVAL'; r.selectedQuote=qid;
  if(!S.pending.includes(qid)) S.pending.push(qid);
  log(S.user.name,`selected ${v?v.name:'vendor'}'s quotation (${fmt(qTotal(q))}) for RFQ-${r.id} → approval`,'#B45309');
  notify(`RFQ-${r.id}: quotation sent for manager approval`);
  toast('Sent for approval — log in as Manager to approve ✓');
  buildNav(); rCompare(); reveal($('pg-compare')); countUp($('pg-compare'));
  fetch(`${API}/quotes/${qid}/select`,{method:'POST',headers:authHeaders()}).catch(()=>{});
}

/* ================= APPROVALS ================= */
function rApprovals(){
  const pend=S.pending.map(qid=>S.quotes.find(q=>q.id===qid));
  $('pg-approvals').innerHTML = phead('05','DECISION GATE','Approval Workflow',`${pend.length} request(s) waiting for a decision`)
  + `<div class="card rv"><div class="card-h"><div class="kicker"><b>QUEUE</b> · PENDING</div>
    <div class="right"><span class="badge ${pend.length?'b-red':'b-green'}">${pend.length} waiting</span></div></div>
  <div class="card-b flush">
  ${pend.length?`<table><thead><tr><th>RFQ</th><th>Vendor</th><th>Amount</th><th>Delivery</th><th>Requested by</th><th></th></tr></thead><tbody>
    ${pend.map(q=>{const r=S.rfqs.find(x=>x.id===q.rfq),v=vById(q.vendor);return `<tr>
      <td><span class="mono">RFQ-${r.id}</span><br><span class="t-strong">${r.title}</span></td>
      <td>${v?v.name:''}<br><span class="stars">${v?stars(v.rating):''}</span></td>
      <td class="mono" style="font-size:14px;color:var(--red)">${fmt(qTotal(q))}</td><td class="mono">${q.days} days</td><td class="t-muted">${r.createdBy}</td>
      <td><button class="btn btn-dark btn-sm" onclick="S.cur.quote=${q.id};go('approval-detail')">Review <span class="ar">›</span></button></td></tr>`;}).join('')}
    </tbody></table>`
  :`<div class="empty"><b>All clear</b>No procurement requests waiting for approval.</div>`}
  </div></div>
  <div class="card rv"><div class="card-h"><div class="kicker"><b>LOG</b> · DECISIONS</div></div><div class="card-b flush">
  <table><thead><tr><th>RFQ</th><th>Decision</th><th>Remark</th><th>By</th><th>When</th></tr></thead><tbody>
  ${S.approvals.map(a=>{const r=S.rfqs.find(x=>x.id===a.rfq);return `<tr><td><span class="mono">RFQ-${a.rfq}</span> ${r?r.title:''}</td>
    <td>${badge(a.action)}</td><td class="t-muted">${a.remark}</td><td>${a.by}</td><td class="t-muted mono">${dstr(a.at)}</td></tr>`}).join('')||'<tr><td colspan="5" class="t-muted" style="padding:18px">No decisions yet.</td></tr>'}
  </tbody></table></div></div>`;
}
function rApprovalDetail(){
  const q=S.quotes.find(x=>x.id===S.cur.quote), r=S.rfqs.find(x=>x.id===q.rfq), v=vById(q.vendor);
  const others=S.quotes.filter(x=>x.rfq===r.id&&x.id!==q.id);
  $('pg-approval-detail').innerHTML=`<a class="back" onclick="go('approvals')">← Back to approvals</a>`
  + phead('05','DECISION GATE','Review request',`<span class="mono">RFQ-${r.id}</span> · requested by ${r.createdBy} &nbsp; ${badge('UNDER_APPROVAL')}`)
  + `<div class="grid2"><div>
    <div class="card rv"><div class="card-b">
      <p style="font-size:17px;font-weight:800;color:var(--ink);margin-bottom:4px">${r.title}</p>
      <p class="t-muted" style="margin-bottom:18px">${r.desc||''}</p>
      <table><thead><tr><th>Item</th><th>Unit price</th><th>Qty</th><th style="text-align:right">Total</th></tr></thead><tbody>
      ${q.items.map(i=>`<tr><td>${i.name}</td><td class="mono">${fmt(i.price)}</td><td class="mono">${i.qty}</td><td style="text-align:right" class="mono">${fmt(i.price*i.qty)}</td></tr>`).join('')}
      <tr><td colspan="3" style="font-weight:700;color:var(--ink)">${v?v.name:''} <span class="stars">${v?stars(v.rating):''}</span></td>
      <td style="text-align:right;font-weight:800;font-size:17px;color:var(--red)">${fmt(qTotal(q))}</td></tr></tbody></table>
      ${others.length?`<p class="t-muted" style="margin-top:14px">Other quotes: ${others.map(o=>(vById(o.vendor)?.name.split(' ')[0]||'')+' '+fmt(qTotal(o))).join(' · ')}</p>`:''}
      <div style="display:flex;gap:10px;margin-top:20px">
        <button class="btn btn-dark" onclick="approve(${q.id})">Approve — auto-create PO <span class="ar">›</span></button>
        <button class="btn btn-red" onclick="$('rejectModal').classList.add('on')">Reject</button></div>
    </div></div></div>
    <div><div class="card rv" style="--d:120ms"><div class="card-h"><div class="kicker"><b>TRAIL</b> · TIMELINE</div></div><div class="card-b"><div class="tl">
      <div class="tl-item" style="--tc:#121212"><b>RFQ created</b><span>${r.createdBy} · ${dstr(r.created)}</span></div>
      <div class="tl-item" style="--tc:#B45309"><b>${S.quotes.filter(x=>x.rfq===r.id).length} quotation(s) received</b><span>compared by ${r.createdBy}</span></div>
      <div class="tl-item" style="--tc:#B45309"><b>${v?v.name:''} selected</b><span>${fmt(qTotal(q))} · ${q.days} days delivery</span></div>
      <div class="tl-item" style="--tc:#E11900"><b>Awaiting your decision</b><span>now</span></div>
    </div></div></div></div></div>`;
}
async function approve(qid){
  const q=S.quotes.find(x=>x.id===qid), r=S.rfqs.find(x=>x.id===q.rfq), v=vById(q.vendor);
  q.status='APPROVED'; r.status='PO_CREATED'; S.pending=S.pending.filter(x=>x!==qid);
  S.approvals.unshift({id:S.seq.appr++,quote:qid,rfq:r.id,by:S.user.name,action:'APPROVED',remark:'Approved via workflow',at:new Date()});
  const num='PO-2026-'+String(S.seq.po).padStart(4,'0');
  S.pos.unshift({id:S.seq.po++,num,rfq:r.id,quote:qid,vendor:q.vendor,total:qTotal(q),status:'CREATED',at:new Date()});
  log(S.user.name,`APPROVED quotation for RFQ-${r.id}`,'#0B8A4B');
  log('System',`auto-created ${num} for ${v?v.name:''} (${fmt(qTotal(q))})`,'#0B8A4B');
  notify(`${num} auto-created for ${v?v.name:''}`);
  toast(`Approved ✓ ${num} auto-created`);
  buildNav(); go('approvals');
  fetch(`${API}/quotes/${qid}/approve`,{method:'POST',headers:authHeaders(),body:JSON.stringify({remark:'Approved via workflow'})}).catch(()=>{});
}
async function confirmReject(){
  const remark=rejRemark.value.trim(); if(!remark) return toast('A remark is required to reject',1);
  const q=S.quotes.find(x=>x.id===S.cur.quote), r=S.rfqs.find(x=>x.id===q.rfq);
  q.status='SUBMITTED'; r.status='REJECTED'; S.pending=S.pending.filter(x=>x!==q.id);
  S.approvals.unshift({id:S.seq.appr++,quote:q.id,rfq:r.id,by:S.user.name,action:'REJECTED',remark,at:new Date()});
  log(S.user.name,`REJECTED RFQ-${r.id} — “${remark}”`,'#E11900');
  notify(`RFQ-${r.id} rejected — back to officer`);
  closeModal('rejectModal'); rejRemark.value='';
  toast('Rejected — sent back to the officer'); buildNav(); go('approvals');
}

/* ================= PO & INVOICE ================= */
function rPos(){
  let pos=S.pos;
  if(S.user.role==='vendor') pos=pos.filter(p=>p.vendor===S.user.vendorId);
  $('pg-pos').innerHTML = phead('06','DOCUMENTS','Purchase Orders & Invoices','Approved quotes become POs automatically · invoices carry 18% GST')
  + `<div class="card rv"><div class="card-h"><div class="kicker"><b>PO</b> · ORDERS</div></div><div class="card-b flush">
  ${pos.length?`<table><thead><tr><th>PO Number</th><th>RFQ</th><th>Vendor</th><th>Amount</th><th>Status</th><th>Date</th><th></th></tr></thead><tbody>
  ${pos.map(p=>{const r=S.rfqs.find(x=>x.id===p.rfq),v=vById(p.vendor);const inv=S.invoices.find(i=>i.po===p.id);
    let act='';
    if(S.user.role==='officer'){ act=inv?`<button class="btn btn-line btn-sm" onclick="openInvoice(${inv.id})">View invoice</button>`
      :`<button class="btn btn-dark btn-sm" onclick="genInvoice(${p.id})">Generate invoice <span class="ar">›</span></button>`; }
    else if(inv) act=`<button class="btn btn-line btn-sm" onclick="openInvoice(${inv.id})">View invoice</button>`;
    return `<tr><td class="mono" style="font-size:13px;color:var(--ink);font-weight:700">${p.num}</td>
    <td><span class="mono">RFQ-${p.rfq}</span><br><span class="t-muted">${r?r.title:''}</span></td>
    <td>${v?v.name:''}</td><td class="mono" style="font-size:14px">${fmt(p.total)}</td>
    <td>${badge(inv?'INVOICED':p.status)}</td><td class="t-muted mono">${dstr(p.at)}</td><td>${act}</td></tr>`}).join('')}
  </tbody></table>`:`<div class="empty"><b>No purchase orders yet</b>Approve a quotation and the PO appears here automatically.</div>`}
  </div></div>
  <div class="card rv" style="--d:120ms"><div class="card-h"><div class="kicker"><b>INV</b> · BILLING</div></div><div class="card-b flush">
  ${S.invoices.length?`<table><thead><tr><th>Invoice</th><th>PO</th><th>Subtotal</th><th>GST 18%</th><th>Total</th><th>Emailed</th><th></th></tr></thead><tbody>
  ${S.invoices.filter(i=>S.user.role!=='vendor'||S.pos.find(p=>p.id===i.po)?.vendor===S.user.vendorId).map(i=>{const p=S.pos.find(x=>x.id===i.po);return `<tr>
    <td class="mono" style="color:var(--red);font-weight:700">${i.num}</td><td class="mono">${p.num}</td>
    <td class="mono">${fmt(i.subtotal)}</td><td class="mono">${fmt(i.tax)}</td>
    <td class="mono" style="font-weight:700;font-size:14px">${fmt(i.total)}</td>
    <td>${i.emailed?'<span class="badge b-green">Sent</span>':'<span class="badge b-grey">Not yet</span>'}</td>
    <td><button class="btn btn-line btn-sm" onclick="openInvoice(${i.id})">Open <span class="ar">›</span></button></td></tr>`}).join('')}
  </tbody></table>`:`<div class="empty"><b>No invoices yet</b></div>`}
  </div></div>`;
}
async function genInvoice(poId){
  const p=S.pos.find(x=>x.id===poId);
  const subtotal=p.total, tax=Math.round(subtotal*0.18), total=subtotal+tax;
  const num='INV-2026-'+String(S.seq.inv).padStart(4,'0');
  const inv={id:S.seq.inv++,num,po:poId,subtotal,tax,total,emailed:false,status:'GENERATED',at:new Date()};
  S.invoices.unshift(inv); p.status='INVOICED';
  const r=S.rfqs.find(x=>x.id===p.rfq); if(r) r.status='INVOICED';
  log('System',`generated invoice ${num} (${fmt(total)}) from ${p.num}`,'#E11900');
  notify(`Invoice ${num} generated — ready to print/email`);
  toast(`${num} generated with 18% GST ✓`);
  openInvoice(inv.id);
  // Persist to DB in background
  fetch(`${API}/pos/${poId}/invoice`,{method:'POST',headers:authHeaders()}).catch(()=>{});
}
function openInvoice(id){ S.cur.inv=id; go('invoice'); }
function invoiceHTML(inv){
  const p=S.pos.find(x=>x.id===inv.po), r=S.rfqs.find(x=>x.id===p.rfq), v=vById(p.vendor), q=S.quotes.find(x=>x.id===p.quote);
  return `<div class="inv-paper">
    <div class="inv-top"><div><h2>TAX INVOICE</h2><span class="mono">${inv.num} · ${p.num}</span></div>
      <div style="text-align:right"><div class="bm" style="width:38px;height:38px;border-radius:10px;background:#fff;color:var(--ink);display:grid;place-items:center;font-weight:900;font-size:18px;margin-left:auto">V</div>
      <b style="display:block;margin-top:8px">VendorBridge Corp</b><span style="font-family:var(--mono);font-size:10px;opacity:.7">GSTIN 24VBCPL1234A1Z9 · AHMEDABAD, GJ</span></div></div>
    <div class="inv-meta">
      <div><h5>Billed to / Vendor</h5><p><b>${v?v.name:''}</b><br>GSTIN ${v?v.gst:''}<br>${v?v.email:''}<br>${v?v.phone:''}</p></div>
      <div><h5>Reference</h5><p>RFQ: <span class="mono">RFQ-${p.rfq}</span> — ${r?r.title:''}<br>
        PO date: ${dstr(p.at)}<br>Invoice date: ${dstr(inv.at)}<br>Delivery: ${q?q.days+' days':'—'}</p></div></div>
    <div class="inv-body">
      <table><thead><tr><th>#</th><th>Description</th><th>Unit price</th><th>Qty</th><th style="text-align:right">Amount</th></tr></thead><tbody>
      ${q.items.map((i,n)=>`<tr><td class="mono">${String(n+1).padStart(2,'0')}</td><td class="t-strong">${i.name}</td><td class="mono">${fmt(i.price)}</td><td class="mono">${i.qty}</td><td style="text-align:right" class="mono">${fmt(i.price*i.qty)}</td></tr>`).join('')}
      </tbody></table>
      <div class="inv-tot">
        <div><span>Subtotal</span><b class="mono">${fmt(inv.subtotal)}</b></div>
        <div><span>GST @ 18%</span><b class="mono">${fmt(inv.tax)}</b></div>
        <div class="grand"><span>Grand Total</span><span>${fmt(inv.total)}</span></div></div></div>
    <div class="inv-foot">PAYMENT WITHIN 30 DAYS · SYSTEM-GENERATED BY VENDORBRIDGE · ${inv.num}</div>
  </div>`;
}
function rInvoice(){
  const inv=S.invoices.find(x=>x.id===S.cur.inv);
  $('pg-invoice').innerHTML=`<a class="back" onclick="go('pos')">← Back to POs & invoices</a>
  <div class="rv" style="display:flex;gap:10px;justify-content:center;margin-bottom:20px;flex-wrap:wrap">
    <button class="btn btn-dark" onclick="printInvoice()">Download / Print PDF <span class="ar">›</span></button>
    <button class="btn ${inv.emailed?'btn-line':'btn-red'}" onclick="emailInvoice(${inv.id})" ${inv.emailed?'disabled':''}>${inv.emailed?'✓ Emailed to vendor':'Email to vendor'}</button>
  </div>
  <div class="rv" style="--d:120ms">${invoiceHTML(inv)}</div>`;
}
function printInvoice(){
  const inv=S.invoices.find(x=>x.id===S.cur.inv);
  $('printArea').innerHTML=invoiceHTML(inv);
  log(S.user.name,`printed / downloaded ${inv.num}`,'#E11900');
  window.print();
}
async function emailInvoice(id){
  const inv=S.invoices.find(x=>x.id===id), p=S.pos.find(x=>x.id===inv.po), v=vById(p.vendor);
  inv.emailed=true;
  log('System',`emailed ${inv.num} to ${v?v.email:''}`,'#E11900');
  notify(`Invoice ${inv.num} emailed to ${v?v.email:''}`);
  toast(`${inv.num} sent to ${v?v.email:''} ✓`);
  rInvoice(); reveal($('pg-invoice'));
  // Persist to DB in background
  fetch(`${API}/invoices/${id}/email`,{method:'POST',headers:authHeaders()}).catch(()=>{});
}

/* ================= LOGS / REPORTS / USERS ================= */
function rLogs(){
  $('pg-logs').innerHTML = phead('07','AUDIT TRAIL','Activity Logs',`${S.logs.length} events recorded — every click leaves a trace`)
  + `<div class="card rv" style="max-width:800px"><div class="card-b"><div class="tl">
  ${S.logs.map((l,i)=>`<div class="tl-item rv" style="--tc:${l.c};--d:${i*45}ms"><b>${l.who}</b><span>${l.what} · ${ago(l.min)}</span></div>`).join('')}
  </div></div></div>`;
}
function rReports(){
  const max=Math.max(...S.history.map(h=>h.v));
  const counts={}; S.rfqs.forEach(r=>counts[r.status]=(counts[r.status]||0)+1);
  const dCols={SENT:'#121212',QUOTED:'#B45309',UNDER_APPROVAL:'#B45309',PO_CREATED:'#121212',INVOICED:'#E11900',REJECTED:'#E11900',DRAFT:'#A3A29B',APPROVED:'#0B8A4B'};
  const entries=Object.entries(counts); const totR=S.rfqs.length;
  const spendByVendor={}; S.invoices.forEach(i=>{const p=S.pos.find(x=>x.id===i.po);const v=vById(p.vendor);if(v)spendByVendor[v.name]=(spendByVendor[v.name]||0)+i.total;});
  $('pg-reports').innerHTML = phead('08','INSIGHT','Reports & Analytics','Spend trends, status mix and vendor performance',
    `<button class="btn btn-line" onclick="exportCSV()">Export CSV <span class="ar">›</span></button>`)
  + `<div class="grid2">
    <div class="card rv"><div class="card-h"><div class="kicker"><b>A</b> · MONTHLY SPEND (₹ LAKH)</div></div>
      <div class="card-b"><div class="bars">
      ${S.history.map((h,i)=>`<div class="bar-w"><div class="bar ${i===S.history.length-1?'hot':''}" data-h="${h.v/max*100}"><span class="tip">${h.v}</span></div><small>${h.m}</small></div>`).join('')}
      </div></div></div>
    <div class="card rv" style="--d:120ms"><div class="card-h"><div class="kicker"><b>B</b> · RFQS BY STATUS</div></div><div class="card-b">
      <div class="donut-wrap">
        <div class="donut" id="donut"><div class="hole">${totR}</div></div>
        <div class="legend">${entries.map(([s,c])=>`<div><i style="background:${dCols[s]||'#999'}"></i>${STATUS[s]?STATUS[s][1]:s} — <b>&nbsp;${c}</b></div>`).join('')}</div>
      </div></div></div>
  </div>
  <div class="card rv" style="--d:200ms"><div class="card-h"><div class="kicker"><b>C</b> · VENDOR PERFORMANCE</div></div><div class="card-b flush">
    <table><thead><tr><th>Vendor</th><th>Category</th><th>Rating</th><th>Quotes</th><th>Won</th><th>Invoiced value</th></tr></thead><tbody>
    ${S.vendors.map(v=>{const qs=S.quotes.filter(q=>q.vendor===v.id);const won=qs.filter(q=>q.status==='APPROVED').length;
      return `<tr><td class="t-strong">${v.name}</td><td>${v.cat}</td><td class="stars">${stars(v.rating)}</td>
      <td class="mono">${qs.length}</td><td class="mono ${won?'green':''}">${won}</td><td class="mono">${fmt(spendByVendor[v.name]||0)}</td></tr>`}).join('')}
    </tbody></table></div></div>`;
  const segs=entries.map(([s,c])=>({c,col:dCols[s]||'#999'}));
  sweepDonut($('donut'),segs,totR);
}
function exportCSV(){
  const rows=[['Month','Spend (lakh)'],...S.history.map(h=>[h.m,h.v])].map(r=>r.join(',')).join('\n');
  const a=document.createElement('a'); a.href='data:text/csv;charset=utf-8,'+encodeURIComponent(rows);
  a.download='vendorbridge-monthly-spend.csv'; a.click();
  toast('CSV exported'); log(S.user.name,'exported monthly spend report (CSV)');
}
function rUsers(){
  $('pg-users').innerHTML = phead('09','ACCESS','User Management',`${S.accounts.length} accounts · role-based access control`,
    `<button class="btn btn-dark" onclick="toast('User invite sent (demo) ✓')">Invite user <span class="ar">›</span></button>`)
  + `<div class="card rv" style="max-width:800px"><div class="card-b flush"><table><thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th></tr></thead><tbody>
  ${S.accounts.map(u=>`<tr><td><div style="display:flex;align-items:center;gap:11px">
    <div class="avatar" style="background:${ROLECOLOR[u.role]};width:30px;height:30px;font-size:11px">${u.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()}</div>
    <b style="color:var(--ink)">${u.name}</b></div></td><td class="t-muted">${u.email}</td>
    <td><span class="badge b-ink">${u.label}</span></td><td>${badge('active')}</td></tr>`).join('')}
  </tbody></table></div></div>`;
}

/* ================= BOOT ================= */
reveal($('auth')); countUp($('auth'));
restoreSession(); // restore JWT session if user was previously signed in