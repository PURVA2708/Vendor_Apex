/* ================= HELPERS / STATE ================= */
const fmt = n => '₹' + Number(n).toLocaleString('en-IN');
const today = new Date();
const dstr = d => new Date(d).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'numeric'});
const ago = m => m===0?'just now':(m<60? m+' min ago' : m<1440? Math.round(m/60)+' hr ago' : Math.round(m/1440)+' d ago');
function addDays(n){ const d=new Date(); d.setDate(d.getDate()+n); return d; }
const $ = id => document.getElementById(id);

const S = {
  user:null,
  accounts:[
    {email:'officer@vb.com', pass:'officer123', name:'Raj Mehta',  role:'officer', label:'Procurement Officer'},
    {email:'manager@vb.com', pass:'manager123', name:'Meera Iyer', role:'manager', label:'Manager / Approver'},
    {email:'vendor1@vb.com', pass:'vendor123',  name:'Apex Furniture', role:'vendor', label:'Vendor', vendorId:1},
    {email:'admin@vb.com',   pass:'admin123',   name:'Arjun Rao',  role:'admin', label:'Administrator'},
  ],
  vendors:[
    {id:1,name:'Apex Furniture Pvt Ltd',cat:'Furniture',gst:'24AAPCA1234F1Z5',email:'sales@apexfurniture.in',phone:'+91 98250 11223',status:'active',rating:4.5},
    {id:2,name:'Crestwood Supplies',cat:'Furniture',gst:'24BBQCW5678G1Z2',email:'hello@crestwood.in',phone:'+91 99090 44556',status:'active',rating:4.2},
    {id:3,name:'Bharat Office Co',cat:'Furniture',gst:'27CCRBO9012H1Z9',email:'orders@bharatoffice.com',phone:'+91 98700 77889',status:'active',rating:3.8},
    {id:4,name:'Zenith Electronics',cat:'Electronics',gst:'29DDSZE3456J1Z4',email:'biz@zenithelec.in',phone:'+91 96320 12340',status:'active',rating:4.7},
    {id:5,name:'Omni Traders',cat:'Stationery',gst:'24EEOMT7890K1Z1',email:'omni@traders.in',phone:'+91 97250 90901',status:'inactive',rating:4.0},
  ],
  rfqs:[
    {id:1024,title:'50 Office Chairs — Ergonomic',desc:'High-back mesh chairs with lumbar support for the new Ahmedabad office floor.',deadline:addDays(6),status:'QUOTED',createdBy:'Raj Mehta',created:addDays(-3),
      items:[{name:'Ergonomic Mesh Chair',qty:50,unit:'pcs'}],vendors:[1,2,3],attach:'chair-specs.pdf',selectedQuote:null},
    {id:1025,title:'20 Developer Laptops',desc:'16GB RAM / 512GB SSD laptops for engineering team.',deadline:addDays(-2),status:'INVOICED',createdBy:'Raj Mehta',created:addDays(-12),
      items:[{name:'Laptop 16GB/512GB',qty:20,unit:'pcs'}],vendors:[4],attach:null,selectedQuote:104},
    {id:1026,title:'A4 Printer Paper — 500 reams',desc:'75 GSM A4 paper, quarterly stock.',deadline:addDays(4),status:'SENT',createdBy:'Raj Mehta',created:addDays(-1),
      items:[{name:'A4 Paper 75GSM Ream',qty:500,unit:'reams'}],vendors:[1,5],attach:null,selectedQuote:null},
  ],
  quotes:[
    {id:101,rfq:1024,vendor:1,items:[{name:'Ergonomic Mesh Chair',price:2000,qty:50}],days:12,notes:'Free installation & 2-yr warranty.',status:'SUBMITTED',at:addDays(-2)},
    {id:102,rfq:1024,vendor:2,items:[{name:'Ergonomic Mesh Chair',price:1800,qty:50}],days:15,notes:'Bulk price. Freight included.',status:'SUBMITTED',at:addDays(-1)},
    {id:103,rfq:1024,vendor:3,items:[{name:'Ergonomic Mesh Chair',price:2200,qty:50}],days:8,notes:'Fastest delivery, premium build.',status:'SUBMITTED',at:addDays(-1)},
    {id:104,rfq:1025,vendor:4,items:[{name:'Laptop 16GB/512GB',price:62000,qty:20}],days:10,notes:'Onsite warranty.',status:'APPROVED',at:addDays(-10)},
  ],
  approvals:[ {id:1,quote:104,rfq:1025,by:'Meera Iyer',action:'APPROVED',remark:'Within IT budget. Proceed.',at:addDays(-9)} ],
  pos:[ {id:1,num:'PO-2026-0001',rfq:1025,quote:104,vendor:4,total:1240000,status:'INVOICED',at:addDays(-9)} ],
  invoices:[ {id:1,num:'INV-2026-0001',po:1,subtotal:1240000,tax:223200,total:1463200,emailed:true,status:'PAID',at:addDays(-8)} ],
  logs:[
    {who:'Raj Mehta',what:'created RFQ #RFQ-1026 “A4 Printer Paper — 500 reams”',min:1440,c:'#121212'},
    {who:'Bharat Office Co',what:'submitted quotation for RFQ-1024 (₹1,10,000)',min:1500,c:'#B45309'},
    {who:'Crestwood Supplies',what:'submitted quotation for RFQ-1024 (₹90,000)',min:1560,c:'#B45309'},
    {who:'Apex Furniture',what:'submitted quotation for RFQ-1024 (₹1,00,000)',min:2880,c:'#B45309'},
    {who:'System',what:'emailed INV-2026-0001 to biz@zenithelec.in',min:11520,c:'#E11900'},
    {who:'System',what:'generated invoice INV-2026-0001 (₹14,63,200)',min:11530,c:'#E11900'},
    {who:'System',what:'auto-created PO-2026-0001 for Zenith Electronics',min:12950,c:'#0B8A4B'},
    {who:'Meera Iyer',what:'APPROVED quotation for RFQ-1025 — “Within IT budget. Proceed.”',min:12960,c:'#0B8A4B'},
    {who:'Raj Mehta',what:'created RFQ #RFQ-1025 “20 Developer Laptops”',min:17280,c:'#121212'},
  ],
  notifs:[
    {t:'3 quotations received for RFQ-1024 — ready to compare',min:1500},
    {t:'RFQ-1026 sent to 2 vendors',min:1440},
    {t:'Invoice INV-2026-0001 emailed successfully',min:11520},
  ],
  history:[ {m:'JAN',v:8.4},{m:'FEB',v:11.2},{m:'MAR',v:6.8},{m:'APR',v:13.5},{m:'MAY',v:9.7},{m:'JUN',v:14.6} ],
  seq:{rfq:1027, quote:105, po:2, inv:2, appr:2, vendor:6},
  pending:[], cur:{rfq:null,quote:null,inv:null}
};

const STATUS = {
  DRAFT:['b-grey','Draft'], SENT:['b-ink','Sent to vendors'], QUOTED:['b-amber','Quotes received'],
  UNDER_APPROVAL:['b-amber','Under approval'], APPROVED:['b-green','Approved'], REJECTED:['b-red','Rejected'],
  PO_CREATED:['b-ink','PO created'], INVOICED:['b-red','Invoiced'], PAID:['b-green','Paid'],
  SUBMITTED:['b-ink','Submitted'], SELECTED:['b-amber','Sent for approval'], CREATED:['b-ink','Created'],
  active:['b-green','Active'], inactive:['b-grey','Inactive']
};
const badge = s => { const [c,l]=STATUS[s]||['b-grey',s]; return `<span class="badge ${c}">${l}</span>`; };
const vById = id => S.vendors.find(v=>v.id===id);
const qTotal = q => q.items.reduce((a,i)=>a+i.price*i.qty,0);
const stars = r => '★'.repeat(Math.round(r))+'☆'.repeat(5-Math.round(r))+` <span style="color:var(--muted)">${r}</span>`;
const ROLECOLOR = {officer:'#121212',manager:'#B45309',vendor:'#E11900',admin:'#0B8A4B'};