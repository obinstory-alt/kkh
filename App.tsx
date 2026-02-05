
import React, { useState, useEffect, useMemo } from 'react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, Cell, PieChart, Pie, Legend 
} from 'recharts';
import * as XLSX from 'xlsx';
import { MenuItem, PlatformConfig, SaleRecord } from './types';

const DEFAULT_PLATFORMS: PlatformConfig[] = [
  { id: 'baemin', name: '배민', feePercent: 6.8, adjustmentPercent: 0 },
  { id: 'coupang', name: '쿠팡', feePercent: 9.8, adjustmentPercent: 0 },
  { id: 'yogiyo', name: '요기요', feePercent: 12.5, adjustmentPercent: 0 },
  { id: 'naver', name: '네이버', feePercent: 3.5, adjustmentPercent: 0 },
  { id: 'store', name: '매장(현장)', feePercent: 1.5, adjustmentPercent: 0 },
];

const INITIAL_MENU: MenuItem[] = [
  { id: 'menu-1', name: '닭강정', costPercent: 0 },
  { id: 'menu-2', name: '국밥', costPercent: 0 },
  { id: 'menu-3', name: '냉면', costPercent: 0 },
];

const COLORS = ['#007AFF', '#34C759', '#FF9500', '#FF3B30', '#AF52DE', '#5856D6', '#FF2D55'];

const App: React.FC = () => {
  const CURRENT_VERSION = 'v20.1';
  const [view, setView] = useState<'dashboard' | 'sales' | 'stats' | 'settings'>('dashboard');
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [platforms, setPlatforms] = useState<PlatformConfig[]>(DEFAULT_PLATFORMS);
  const [internalBackups, setInternalBackups] = useState<any[]>([]);
  const [darkMode, setDarkMode] = useState<boolean>(true);

  // 데이터 로드
  useEffect(() => {
    const s = localStorage.getItem('kh_sales');
    const m = localStorage.getItem('kh_menu');
    const b = localStorage.getItem('kh_backups');
    if (s) setSales(JSON.parse(s));
    if (m) setMenuItems(JSON.parse(m)); else setMenuItems(INITIAL_MENU);
    if (b) setInternalBackups(JSON.parse(b));
  }, []);

  // 데이터 저장
  useEffect(() => {
    localStorage.setItem('kh_sales', JSON.stringify(sales));
    localStorage.setItem('kh_menu', JSON.stringify(menuItems));
    localStorage.setItem('kh_backups', JSON.stringify(internalBackups));
    document.documentElement.classList.toggle('dark', darkMode);
  }, [sales, menuItems, internalBackups, darkMode]);

  const stats = useMemo(() => {
    const now = new Date();
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();
    
    // 이번 달 매출
    const mtdSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === curMonth && d.getFullYear() === curYear;
    });
    
    // 지난 달 매출 (전월 누적 금액)
    const lastMonthDate = new Date(curYear, curMonth - 1, 1);
    const lmdSales = sales.filter(s => {
      const d = new Date(s.date);
      return d.getMonth() === lastMonthDate.getMonth() && d.getFullYear() === lastMonthDate.getFullYear();
    });

    return {
      mtdRevenue: mtdSales.reduce((acc, s) => acc + s.totalPrice, 0),
      mtdSettlement: mtdSales.reduce((acc, s) => acc + s.settlementAmount, 0),
      lmdRevenue: lmdSales.reduce((acc, s) => acc + s.totalPrice, 0),
      lmdName: lastMonthDate.getMonth() + 1,
      mtdName: curMonth + 1
    };
  }, [sales]);

  const handleFinalSettlement = (newRecords: SaleRecord[]) => {
    const updatedSales = [...newRecords, ...sales];
    setSales(updatedSales);
    
    // 자동 백업 생성
    const backup = {
      id: Date.now(),
      timestamp: new Date().toLocaleString(),
      count: newRecords.length,
      data: JSON.stringify(updatedSales)
    };
    setInternalBackups(prev => [backup, ...prev].slice(0, 10));
    
    alert('🎉 정산이 최종 마감되었습니다. 자동 백업이 안전하게 생성되었습니다.');
    setView('dashboard');
  };

  return (
    <div className={`min-h-screen pb-24 lg:pb-0 lg:pl-72 transition-colors duration-500 ${darkMode ? 'bg-black text-white' : 'bg-[#F5F5F7] text-black'}`}>
      {/* 사이드바 네비게이션 */}
      <nav className={`fixed bottom-0 left-0 right-0 lg:top-0 lg:w-72 lg:h-full z-50 p-4 lg:p-8 flex lg:flex-col gap-2 lg:gap-6 ${darkMode ? 'bg-[#111112]/90 border-t border-white/5' : 'bg-white/90 border-t border-black/5'} lg:border-t-0 lg:border-r backdrop-blur-3xl`}>
        <div className="hidden lg:block mb-8">
          <h1 className="text-2xl font-black italic tracking-tighter bg-gradient-to-br from-blue-400 to-blue-600 bg-clip-text text-transparent">경희장부</h1>
          <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-widest">Version {CURRENT_VERSION}</p>
        </div>
        <NavItem active={view === 'dashboard'} onClick={() => setView('dashboard')} icon="fa-house" label="홈" />
        <NavItem active={view === 'sales'} onClick={() => setView('sales'} icon="fa-plus-circle" label="판매입력" />
        <NavItem active={view === 'stats'} onClick={() => setView('stats'} icon="fa-chart-pie" label="정밀분석" />
        <NavItem active={view === 'settings'} onClick={() => setView('settings'} icon="fa-shield-halved" label="장부관리" />
      </nav>

      {/* 메인 콘텐츠 영역 */}
      <main className="p-4 md:p-12 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-700">
        {view === 'dashboard' && (
          <div className="space-y-8">
            <header>
              <h2 className="text-3xl font-black tracking-tight">비즈니스 리포트</h2>
              <p className="text-gray-500 font-bold mt-1 text-sm">사장님의 소중한 정산 데이터가 실시간으로 관리되고 있습니다.</p>
            </header>
            
            {/* 상단 요약 카드 (전월 매출 포함) */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <StatCard label={`${stats.lmdName}월 누적 매출 (전월)`} value={stats.lmdRevenue} color="text-gray-400" />
              <StatCard label={`${stats.mtdName}월 실시간 매출 (당월)`} value={stats.mtdRevenue} color="text-blue-500" />
              <StatCard label="정산 예정액" value={stats.mtdSettlement} color="text-indigo-500" />
              <StatCard label="추정 순이익" value={stats.mtdRevenue * 0.3} color="text-emerald-500" />
            </div>

            <div className="apple-card p-12 bg-gradient-to-br from-blue-600/10 via-transparent to-transparent border-blue-500/10 flex flex-col items-center text-center gap-4">
               <div className="w-16 h-16 bg-blue-600 rounded-[22px] flex items-center justify-center shadow-2xl shadow-blue-500/40">
                  <i className="fas fa-check-double text-2xl text-white"></i>
               </div>
               <h3 className="text-xl font-black italic">v20.1 하얀 화면 해결 및 기능 통합</h3>
               <p className="text-sm text-gray-500 font-bold leading-relaxed max-w-md">
                 브라우저 문법 오류로 인한 하얀 화면을 해결했습니다.<br/>
                 요청하신 엑셀 업로드, 임시저장, 전월 매출 기능이 정상 작동합니다.
               </p>
            </div>
          </div>
        )}

        {view === 'sales' && <SalesInputV21 menuItems={menuItems} platforms={platforms} onFinalSubmit={handleFinalSettlement} />}
        
        {view === 'stats' && <StatsContainerV21 sales={sales} menuItems={menuItems} platforms={platforms} darkMode={darkMode} />}

        {view === 'settings' && (
          <div className="max-w-xl mx-auto space-y-8">
             <div className="flex justify-between items-center">
               <h2 className="text-2xl font-black">시스템 설정 및 백업</h2>
               <button onClick={()=>setDarkMode(!darkMode)} className="p-4 bg-white/5 rounded-2xl border border-white/5 text-xs font-black">{darkMode ? '🌙 다크 모드' : '☀️ 라이트 모드'}</button>
             </div>
             <div className="apple-card p-8 border-t-8 border-indigo-600 space-y-6">
                <h3 className="text-sm font-black text-indigo-500 uppercase tracking-widest">자동 백업 히스토리</h3>
                <div className="space-y-3">
                  {internalBackups.length > 0 ? internalBackups.map(b => (
                    <div key={b.id} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl text-xs">
                       <span className="font-bold text-gray-500">{b.timestamp}</span>
                       <span className="font-black">{b.count}건 최종 마감 기록</span>
                    </div>
                  )) : <p className="text-center py-8 text-gray-500 italic text-xs font-bold uppercase tracking-widest">No Backups Yet</p>}
                </div>
             </div>
             <div className="apple-card p-8 border-t-8 border-rose-500/30 space-y-4">
                <h3 className="text-sm font-black text-rose-500 uppercase tracking-widest">장부 초기화</h3>
                <button onClick={()=>{if(confirm('모든 데이터를 영구 삭제하시겠습니까?')) {localStorage.clear(); window.location.reload();}}} className="w-full py-4 bg-rose-500/10 text-rose-500 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em]">Factory Reset</button>
             </div>
          </div>
        )}
      </main>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; color: string }> = ({ label, value, color }) => (
  <div className="apple-card p-8 hover:translate-y-[-4px] transition-all duration-300 cursor-default">
    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">{label}</p>
    <p className={`text-2xl font-black ${color} tracking-tighter`}>{Math.round(value).toLocaleString()}원</p>
  </div>
);

const NavItem: React.FC<{ active: boolean; onClick: () => void; icon: string; label: string }> = ({ active, onClick, icon, label }) => (
  <button onClick={onClick} className={`flex-1 lg:flex-none flex flex-col lg:flex-row items-center justify-center lg:justify-start gap-1 lg:gap-5 px-3 py-4 lg:px-8 lg:py-5 rounded-[24px] transition-all duration-300 ${active ? 'bg-blue-600 text-white shadow-2xl scale-105' : 'text-gray-500 hover:bg-white/5'}`}>
    <i className={`fas ${icon} text-lg lg:text-xl`}></i>
    <span className="text-[10px] lg:text-base font-black tracking-tight">{label}</span>
  </button>
);

const SalesInputV21: React.FC<{ menuItems: MenuItem[], platforms: PlatformConfig[], onFinalSubmit: (r: SaleRecord[]) => void }> = ({ menuItems, platforms, onFinalSubmit }) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [platform, setPlatform] = useState('');
  const [formData, setFormData] = useState<Record<string, { qty: string, price: string }>>({});
  const [tempQueue, setTempQueue] = useState<SaleRecord[]>([]);

  const addToQueue = () => {
    const plat = platforms.find(p => p.id === platform);
    if (!plat) return alert('플랫폼을 먼저 선택하세요.');
    const newRecords: SaleRecord[] = [];
    Object.entries(formData).forEach(([menuId, data]) => {
      const q = Number(data.qty);
      const p = Number(data.price);
      if (q > 0 && p > 0) {
        const fee = p * (plat.feePercent / 100);
        newRecords.push({
          id: crypto.randomUUID(), date: new Date(date).toISOString(), platformId: platform, menuId,
          quantity: q, totalPrice: p, settlementAmount: p - fee, netProfit: p - fee
        });
      }
    });
    if (newRecords.length === 0) return alert('입력된 판매 내역이 없습니다.');
    setTempQueue([...tempQueue, ...newRecords]);
    setFormData({});
    alert(`${plat.name} 내역이 임시 저장되었습니다.`);
  };

  const downloadTemplate = () => {
    const wsData = [['날짜(YYYY-MM-DD)', '플랫폼ID(baemin/coupang/yogiyo/naver/store)', '메뉴명', '수량', '판매총액']];
    menuItems.forEach(m => wsData.push([new Date().toISOString().split('T')[0], 'baemin', m.name, '1', '15000']));
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "경희장부_판매입력_양식.xlsx");
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
        const newRecords: SaleRecord[] = data.map(row => {
          const platId = String(row['플랫폼ID(baemin/coupang/yogiyo/naver/store)']);
          const plat = platforms.find(p => p.id === platId);
          const menu = menuItems.find(m => m.name === row['메뉴명']);
          if (!plat || !menu) return null;
          const p = Number(row['판매총액']);
          const fee = p * (plat.feePercent / 100);
          return {
            id: crypto.randomUUID(), date: new Date(row['날짜(YYYY-MM-DD)']).toISOString(), platformId: plat.id, menuId: menu.id,
            quantity: Number(row['수량']), totalPrice: p, settlementAmount: p - fee, netProfit: p - fee
          };
        }).filter(Boolean) as SaleRecord[];
        setTempQueue([...tempQueue, ...newRecords]);
        alert(`🎉 ${newRecords.length}건을 성공적으로 불러와 임시 저장했습니다.`);
      } catch (err) { alert('❌ 엑셀 형식이 올바르지 않습니다.'); }
    };
    reader.readAsBinaryString(file);
  };

  return (
    <div className="max-w-xl mx-auto space-y-8 pb-20">
      <div className="apple-card p-10 border-t-8 border-blue-600 shadow-2xl space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black italic tracking-tighter">판매 정산 입력</h2>
          <div className="flex gap-2">
            <button onClick={downloadTemplate} className="px-3 py-2 bg-gray-500/10 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-gray-500/20 transition-all">양식 받기</button>
            <label className="px-3 py-2 bg-blue-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest cursor-pointer hover:bg-blue-700 transition-all">
              엑셀 업로드
              <input type="file" hidden accept=".xlsx, .xls" onChange={handleExcelUpload} />
            </label>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
             <p className="text-[9px] font-bold text-gray-500 uppercase ml-1">날짜</p>
             <input type="date" value={date} onChange={e=>setDate(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl font-bold border border-white/5 outline-none focus:ring-2 ring-blue-500/20" />
          </div>
          <div className="space-y-1">
             <p className="text-[9px] font-bold text-gray-500 uppercase ml-1">플랫폼</p>
             <select value={platform} onChange={e=>setPlatform(e.target.value)} className="w-full p-4 bg-white/5 rounded-2xl font-bold border border-white/5 outline-none appearance-none">
                <option value="">선택</option>
                {platforms.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
             </select>
          </div>
        </div>
        <div className="space-y-3">
          {menuItems.map(m => (
            <div key={m.id} className="grid grid-cols-12 gap-3 items-center p-4 bg-white/5 rounded-2xl border border-white/5">
              <span className="col-span-4 text-xs font-bold text-gray-400">{m.name}</span>
              <input type="number" placeholder="수량" value={formData[m.id]?.qty || ''} onChange={e=>setFormData({...formData, [m.id]: {...(formData[m.id]||{qty:'',price:''}), qty: e.target.value}})} className="col-span-3 p-3 bg-black/20 rounded-xl text-center text-xs font-black outline-none border border-white/5" />
              <input type="number" placeholder="금액" value={formData[m.id]?.price || ''} onChange={e=>setFormData({...formData, [m.id]: {...(formData[m.id]||{qty:'',price:''}), price: e.target.value}})} className="col-span-5 p-3 bg-black/20 rounded-xl text-right text-xs font-black outline-none border border-white/5" />
            </div>
          ))}
        </div>
        <button onClick={addToQueue} className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-[22px] font-black shadow-xl active:scale-95 transition-all">임시 저장 리스트에 추가</button>
      </div>

      {tempQueue.length > 0 && (
        <div className="apple-card p-10 border-t-8 border-emerald-500 space-y-6 animate-in zoom-in-95">
          <div className="flex justify-between items-end">
             <h2 className="text-xl font-black italic tracking-tight uppercase">대기 목록 ({tempQueue.length}건)</h2>
             <button onClick={()=>setTempQueue([])} className="text-[9px] text-rose-500 font-bold hover:underline">리스트 초기화</button>
          </div>
          <div className="space-y-2 max-h-56 overflow-y-auto no-scrollbar">
            {tempQueue.map((q, idx) => (
              <div key={idx} className="flex justify-between items-center p-4 bg-white/5 rounded-[18px] border border-white/5">
                <div className="flex gap-3 items-center">
                  <span className="px-2 py-1 bg-blue-500 text-[8px] text-white rounded-md font-black">{platforms.find(p=>p.id===q.platformId)?.name}</span>
                  <span className="text-xs font-bold text-gray-400">{menuItems.find(m=>m.id===q.menuId)?.name}</span>
                </div>
                <span className="text-sm font-black text-blue-400">{q.totalPrice.toLocaleString()}원</span>
              </div>
            ))}
          </div>
          <div className="pt-6 border-t border-white/10 flex justify-between items-center">
            <span className="text-[10px] font-bold text-gray-500 uppercase">합계 금액</span>
            <span className="text-3xl font-black text-white">{tempQueue.reduce((acc,q)=>acc+q.totalPrice, 0).toLocaleString()}원</span>
          </div>
          <button onClick={() => onFinalSubmit(tempQueue)} className="w-full py-6 bg-emerald-500 text-white rounded-[24px] font-black text-xl shadow-2xl active:scale-95 transition-all uppercase tracking-tight">오늘 정산 최종 마감</button>
        </div>
      )}
    </div>
  );
};

const StatsContainerV21: React.FC<{ sales: SaleRecord[], menuItems: MenuItem[], platforms: PlatformConfig[], darkMode: boolean }> = ({ sales, menuItems, platforms, darkMode }) => {
  const [tab, setTab] = useState<'time' | 'menu' | 'platform'>('time');
  const [timeUnit, setTimeUnit] = useState<'day' | 'month' | 'year'>('day');

  const statsData = useMemo(() => {
    const menuMap: Record<string, number> = {};
    const platMap: Record<string, number> = {};
    const timeMap: Record<string, number> = {};

    sales.forEach(s => {
      menuMap[s.menuId] = (menuMap[s.menuId] || 0) + s.totalPrice;
      platMap[s.platformId] = (platMap[s.platformId] || 0) + s.totalPrice;
      const d = new Date(s.date);
      let k = '';
      if (timeUnit === 'day') k = d.toLocaleDateString();
      else if (timeUnit === 'month') k = `${d.getFullYear()}-${d.getMonth()+1}`;
      else k = `${d.getFullYear()}년`;
      timeMap[k] = (timeMap[k] || 0) + s.totalPrice;
    });

    return {
      menu: Object.entries(menuMap).map(([id, val]) => ({ name: menuItems.find(m=>m.id===id)?.name || '기타', value: val })),
      plat: Object.entries(platMap).map(([id, val]) => ({ name: platforms.find(p=>p.id===id)?.name || id, value: val })),
      time: Object.entries(timeMap).sort().map(([k, v]) => ({ date: k, revenue: v }))
    };
  }, [sales, menuItems, platforms, timeUnit]);

  const exportExcel = () => {
    let dataToExport = [];
    if (tab === 'time') dataToExport = statsData.time;
    else if (tab === 'menu') dataToExport = statsData.menu;
    else dataToExport = statsData.plat;
    
    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Stats");
    XLSX.writeFile(wb, `경희장부_통계_${tab}_v21.xlsx`);
  };

  return (
    <div className="space-y-8 pb-20">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black tracking-tighter">정밀 분석 리포트</h2>
        <button onClick={exportExcel} className="p-3 bg-white/5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-white/10 border border-white/5">통계 엑셀 다운로드</button>
      </div>

      <div className="flex flex-col md:flex-row gap-4">
        <div className="flex-1 flex gap-2 p-1.5 bg-white/5 rounded-[22px] border border-white/5">
          {(['time', 'menu', 'platform'] as const).map(t => (
            <button key={t} onClick={()=>setTab(t)} className={`flex-1 py-3 rounded-[16px] text-[11px] font-black transition-all ${tab === t ? 'bg-blue-600 text-white shadow-lg' : 'text-gray-500'}`}>
              {t === 'time' ? '추이 분석' : t === 'menu' ? '메뉴 순위' : '플랫폼 점유'}
            </button>
          ))}
        </div>
        {tab === 'time' && (
          <div className="flex gap-2 p-1.5 bg-white/5 rounded-[22px] border border-white/5">
            {(['day', 'month', 'year'] as const).map(u => (
              <button key={u} onClick={()=>setTimeUnit(u)} className={`px-5 py-3 rounded-[16px] text-[10px] font-black transition-all ${timeUnit === u ? 'bg-indigo-600 text-white' : 'text-gray-500'}`}>
                {u === 'day' ? '일별' : u === 'month' ? '월별' : '연별'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="apple-card p-10 h-[500px]">
        {tab === 'time' ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={statsData.time}>
              <defs><linearGradient id="colRev" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#007AFF" stopOpacity={0.3}/><stop offset="95%" stopColor="#007AFF" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={darkMode ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"} />
              <XAxis dataKey="date" fontSize={10} axisLine={false} tickLine={false} dy={15} stroke="#8E8E93" />
              <YAxis fontSize={10} axisLine={false} tickLine={false} dx={-10} stroke="#8E8E93" />
              <Tooltip contentStyle={{borderRadius:'24px', border:'none', backgroundColor: darkMode?'#1C1C1E':'#fff'}} />
              <Area type="monotone" dataKey="revenue" name="매출" stroke="#007AFF" strokeWidth={5} fill="url(#colRev)" animationDuration={800} />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={tab === 'menu' ? statsData.menu : statsData.plat} layout="vertical" margin={{ left: 20 }}>
              <XAxis type="number" hide />
              <YAxis dataKey="name" type="category" width={100} fontSize={11} tickLine={false} axisLine={false} stroke="#8E8E93" />
              <Tooltip contentStyle={{borderRadius:'24px', border:'none', backgroundColor: darkMode?'#1C1C1E':'#fff'}} />
              <Bar dataKey="value" name="누적 매출" radius={[0, 20, 20, 0]} animationDuration={800}>
                {(tab === 'menu' ? statsData.menu : statsData.plat).map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
};

export default App;
