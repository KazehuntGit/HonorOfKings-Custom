
import React, { useState } from 'react';
import { Player, Role } from '../types';
import { Button } from './Button';
import { ROLES_ORDER } from '../constants';

const HOK_HEROES = [
  // CLASH LANE
  { name: "Arthur", roles: [Role.CLASH] },
  { name: "Sun Ce", roles: [Role.CLASH, Role.JUNGLE] },
  { name: "Kaizer", roles: [Role.CLASH, Role.JUNGLE] },
  { name: "Biron", roles: [Role.CLASH] },
  { name: "Li Xin", roles: [Role.CLASH] },
  { name: "Charlotte", roles: [Role.CLASH] },
  { name: "Lu Bu", roles: [Role.CLASH] },
  { name: "Mulan", roles: [Role.CLASH] },
  { name: "Guan Yu", roles: [Role.CLASH] },
  { name: "Allain", roles: [Role.CLASH] },
  { name: "Fuzi", roles: [Role.CLASH] },
  { name: "Mayene", roles: [Role.CLASH, Role.JUNGLE] },
  { name: "Ukyo Tachibana", roles: [Role.CLASH, Role.JUNGLE] },
  { name: "Dharma", roles: [Role.CLASH, Role.JUNGLE] },
  { name: "Ata", roles: [Role.CLASH, Role.ROAM] },
  { name: "Dun", roles: [Role.CLASH, Role.ROAM] },
  { name: "Yang Jian", roles: [Role.CLASH] },
  { name: "Nezha", roles: [Role.CLASH] },
  { name: "Menki", roles: [Role.CLASH] },

  // JUNGLE
  { name: "Lam", roles: [Role.JUNGLE] },
  { name: "Prince of Lanling", roles: [Role.JUNGLE, Role.ROAM] },
  { name: "Wukong", roles: [Role.JUNGLE] },
  { name: "Li Bai", roles: [Role.JUNGLE] },
  { name: "Han Xin", roles: [Role.JUNGLE] },
  { name: "Luna", roles: [Role.JUNGLE, Role.MID] },
  { name: "Nakoruru", roles: [Role.JUNGLE] },
  { name: "Jing", roles: [Role.JUNGLE] },
  { name: "Pei", roles: [Role.JUNGLE] },
  { name: "Musashi", roles: [Role.JUNGLE, Role.CLASH] },
  { name: "Zilong", roles: [Role.JUNGLE, Role.CLASH] },
  { name: "Butterfly", roles: [Role.JUNGLE] },
  { name: "Dian Wei", roles: [Role.JUNGLE, Role.CLASH] },
  { name: "Fang", roles: [Role.JUNGLE, Role.FARM] },
  { name: "Liu Bei", roles: [Role.JUNGLE] },
  { name: "Cirrus", roles: [Role.JUNGLE] },
  { name: "Augran", roles: [Role.JUNGLE] },
  { name: "Cao Cao", roles: [Role.JUNGLE, Role.CLASH] },
  { name: "Ying", roles: [Role.JUNGLE] },
  { name: "Sima Yi", roles: [Role.JUNGLE, Role.MID] },
  { name: "Yao", roles: [Role.JUNGLE, Role.CLASH] },
  { name: "Agudo", roles: [Role.JUNGLE] },

  // MID LANE
  { name: "Angela", roles: [Role.MID] },
  { name: "Diaochan", roles: [Role.MID] },
  { name: "Xiao Qiao", roles: [Role.MID] },
  { name: "Mai Shiranui", roles: [Role.MID, Role.JUNGLE] },
  { name: "Lady Zhen", roles: [Role.MID] },
  { name: "Milady", roles: [Role.MID] },
  { name: "Heino", roles: [Role.MID, Role.CLASH] },
  { name: "Kongming", roles: [Role.MID, Role.JUNGLE] },
  { name: "Shangguan", roles: [Role.MID, Role.JUNGLE] },
  { name: "Nuwa", roles: [Role.MID] },
  { name: "Zhou Yu", roles: [Role.MID] },
  { name: "Ying Zheng", roles: [Role.MID] },
  { name: "Mozi", roles: [Role.MID, Role.ROAM] },
  { name: "Dr. Bian", roles: [Role.MID] },
  { name: "Gao Jianli", roles: [Role.MID] },
  { name: "Princess Frost", roles: [Role.MID] },
  { name: "Gan & Mo", roles: [Role.MID] },
  { name: "Shen Mengxi", roles: [Role.MID] },
  { name: "Yi Xing", roles: [Role.MID] },
  { name: "Hailie", roles: [Role.MID] },
  { name: "Chang'e", roles: [Role.MID, Role.JUNGLE] },

  // FARM LANE
  { name: "Luban No.7", roles: [Role.FARM] },
  { name: "Marco Polo", roles: [Role.FARM] },
  { name: "Hou Yi", roles: [Role.FARM] },
  { name: "Consort Yu", roles: [Role.FARM] },
  { name: "Di Renjie", roles: [Role.FARM] },
  { name: "Arli", roles: [Role.FARM, Role.JUNGLE] },
  { name: "Lady Sun", roles: [Role.FARM] },
  { name: "Huang Zhong", roles: [Role.FARM] },
  { name: "Garo", roles: [Role.FARM] },
  { name: "Shouyue", roles: [Role.FARM] },
  { name: "Alessio", roles: [Role.FARM] },
  { name: "Loong", roles: [Role.FARM] },
  { name: "Erin", roles: [Role.FARM] },
  { name: "Meng Ya", roles: [Role.FARM] },
  { name: "Laura", roles: [Role.FARM] },
  { name: "Solarus", roles: [Role.FARM] },

  // ROAM
  { name: "Dolia", roles: [Role.ROAM] },
  { name: "Kui", roles: [Role.ROAM] },
  { name: "Zhuangzi", roles: [Role.ROAM, Role.CLASH] },
  { name: "Zhang Fei", roles: [Role.ROAM] },
  { name: "Da Qiao", roles: [Role.ROAM, Role.MID] },
  { name: "Yaria", roles: [Role.ROAM] },
  { name: "Ming", roles: [Role.ROAM] },
  { name: "Cai Yan", roles: [Role.ROAM] },
  { name: "Donghuang", roles: [Role.ROAM] },
  { name: "Liu Shan", roles: [Role.ROAM] },
  { name: "Sun Bin", roles: [Role.ROAM, Role.MID] },
  { name: "Guiguzi", roles: [Role.ROAM] },
  { name: "Taiyi", roles: [Role.ROAM] },
  { name: "Lian Po", roles: [Role.ROAM, Role.CLASH] },
  { name: "Dyadia", roles: [Role.ROAM] }
];

interface BatchItem {
  name: string;
  roles: Role[];
  isAllRoles: boolean;
  action: 'add' | 'bench';
}

interface PlayerFormProps {
  onBatchProcess: (items: BatchItem[]) => void;
  isCoachMode: boolean;
}

export const PlayerForm: React.FC<PlayerFormProps> = ({ onBatchProcess, isCoachMode }) => {
  const [mode, setMode] = useState<'manual' | 'smart'>('manual');
  const [name, setName] = useState('');
  const [isAllRoles, setIsAllRoles] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>([]);
  const [smartInput, setSmartInput] = useState('');

  const toggleRole = (role: Role) => {
    if (isAllRoles) return;
    if (role === Role.COACH) {
        setSelectedRoles(prev => prev.includes(Role.COACH) ? [] : [Role.COACH]);
        return;
    }
    let currentRoles = selectedRoles.filter(r => r !== Role.COACH);
    currentRoles = currentRoles.includes(role) ? currentRoles.filter(r => r !== role) : [...currentRoles, role];
    if (ROLES_ORDER.every(r => currentRoles.includes(r))) { setIsAllRoles(true); setSelectedRoles([]); }
    else { setSelectedRoles(currentRoles); }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || (!isAllRoles && selectedRoles.length === 0)) return;
    onBatchProcess([{ name: name.trim(), isAllRoles, roles: isAllRoles ? [] : selectedRoles, action: 'add' }]);
    setName(''); setIsAllRoles(false); setSelectedRoles([]);
  };

  const handleQuickFill = () => {
     const shuffledHeroes = [...HOK_HEROES].sort(() => 0.5 - Math.random());
     const batchData = shuffledHeroes.slice(0, 15).map(hero => ({ name: hero.name, roles: hero.roles, isAllRoles: false, action: 'add' as const }));
     for(let i=0; i<5; i++) batchData.push({ name: `Flex Player ${i+1}`, roles: [], isAllRoles: true, action: 'add' });
     if (isCoachMode) {
        batchData.push({ name: "Coach Gemik", roles: [Role.COACH], isAllRoles: false, action: 'add' });
        batchData.push({ name: "Coach KPL", roles: [Role.COACH], isAllRoles: false, action: 'add' });
     }
     onBatchProcess(batchData);
  };

  const parseAndSubmitSmartInput = (e: React.FormEvent) => {
    e.preventDefault();
    if (!smartInput.trim()) return;
    
    const lines = smartInput.split(/\n/);
    const batchItems: BatchItem[] = [];
    
    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;
      
      // Skip Discord system lines like " — 2:57"
      if (cleanLine.startsWith('—') || /^\d+:\d+/.test(cleanLine)) return;
      
      // Look for role definitions (lines containing : or - or " )
      // Discord names can end with . or " as seen in user examples
      const parts = cleanLine.split(/[:|-]/);
      
      // If we only have one part, it might just be a header or a name without roles
      // We ignore these to avoid cluttering unless it's clearly an "All Roles" player
      if (parts.length < 2) {
         if (cleanLine.toLowerCase().includes('(all roles)') || cleanLine.toLowerCase().includes('(fill)')) {
            const pName = cleanLine.split('(')[0].trim();
            if (pName) batchItems.push({ name: pName, isAllRoles: true, roles: [], action: 'add' });
         }
         return;
      }
      
      const pName = parts[0].trim();
      const pRoleStr = parts.slice(1).join(' ').toLowerCase();

      let pIsAllRoles = false;
      const pRoles: Role[] = [];
      let pAction: 'add' | 'bench' = 'add';

      // Action detection
      if (pRoleStr.includes('stop') || pRoleStr.includes('bench') || pRoleStr.includes('out') || pRoleStr.includes('afk') || pRoleStr.includes('off')) {
         pAction = 'bench';
      } else {
         // Role detection
         if (pRoleStr.includes('all') || pRoleStr.includes('fill') || pRoleStr.includes('any') || pRoleStr.includes('auto')) {
            pIsAllRoles = true;
         } else {
            if (pRoleStr.includes('clash') || pRoleStr.includes('exp') || pRoleStr.includes('fight') || pRoleStr.includes('clsh')) pRoles.push(Role.CLASH);
            if (pRoleStr.includes('mid') || pRoleStr.includes('mage') || pRoleStr.includes('central')) pRoles.push(Role.MID);
            if (pRoleStr.includes('jung') || pRoleStr.includes('jg') || pRoleStr.includes('assassin') || pRoleStr.includes('hunt')) pRoles.push(Role.JUNGLE);
            if (pRoleStr.includes('farm') || pRoleStr.includes('gold') || pRoleStr.includes('mm') || pRoleStr.includes('adc') || pRoleStr.includes('archer') || pRoleStr.includes('marksman')) pRoles.push(Role.FARM);
            if (pRoleStr.includes('roam') || pRoleStr.includes('supp') || pRoleStr.includes('tank') || pRoleStr.includes('helper')) pRoles.push(Role.ROAM);
            if (isCoachMode && (pRoleStr.includes('coach') || pRoleStr.includes('trainer') || pRoleStr.includes('mgr'))) pRoles.push(Role.COACH);
         }
      }
      
      if (pName && (pAction === 'bench' || pIsAllRoles || pRoles.length > 0)) {
        batchItems.push({ name: pName, isAllRoles: pIsAllRoles, roles: pRoles, action: pAction });
      }
    });
    
    if (batchItems.length > 0) { 
      onBatchProcess(batchItems); 
      setSmartInput(''); 
    }
  };

  const smartPlaceholder = `--- DISCORD COPY-PASTE SUPPORTED ---
Luccy : farm, clash
Kazehunt. : Jungle, mm, clash lane
Matchadanu" : Jungle. roam, clash, farm 

P3 (All Roles)
CoachElite : Coach

--- BENCHING ---
IGN: stop
P2 - bench`;

  return (
    <div className="relative group">
      <div className="absolute -inset-[1px] bg-gradient-to-b from-[#dcb06b]/50 to-transparent clip-corner-md opacity-50"></div>
      <div className="bg-[#0a1a2f]/90 backdrop-blur-md p-6 clip-corner-md relative">
        <div className="flex items-center justify-between mb-6 border-b border-[#dcb06b]/20 pb-4">
          <h3 className="text-xl text-[#dcb06b] font-cinzel font-bold tracking-widest">{mode === 'manual' ? 'New Challenger' : 'Smart Import'}</h3>
          <div className="flex gap-3">
             <button onClick={handleQuickFill} className="px-3 py-1 text-[10px] uppercase font-bold transition-all text-[#dcb06b] border border-[#dcb06b] hover:bg-[#dcb06b] hover:text-[#05090f] clip-corner-sm">AUTO FILL</button>
             <div className="flex bg-[#05090f] p-1 rounded clip-corner-sm border border-[#1e3a5f]">
                <button onClick={() => setMode('manual')} className={`px-3 py-1 text-[10px] uppercase font-bold transition-all ${mode === 'manual' ? 'bg-[#dcb06b] text-[#05090f]' : 'text-[#4a5f78] hover:text-[#dcb06b]'}`}>Manual</button>
                <button onClick={() => setMode('smart')} className={`px-3 py-1 text-[10px] uppercase font-bold transition-all ${mode === 'smart' ? 'bg-[#dcb06b] text-[#05090f]' : 'text-[#4a5f78] hover:text-[#dcb06b]'}`}>Smart Paste</button>
             </div>
          </div>
        </div>
        
        {mode === 'manual' ? (
          <form onSubmit={handleManualSubmit}>
            <div className="mb-6">
              <label className="block text-[10px] uppercase tracking-widest text-[#8a9db8] mb-2 font-bold">Player Name</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="ENTER IGN..." className="w-full bg-[#05090f] border border-[#1e3a5f] p-4 text-[#f0f4f8] focus:outline-none focus:border-[#dcb06b] clip-corner-sm font-orbitron"/>
            </div>
            <div className="mb-8">
              <div className="flex justify-between items-end mb-4">
                 <label className="text-[10px] uppercase tracking-widest text-[#8a9db8] font-bold">Role Preference</label>
                 <label className="flex items-center cursor-pointer">
                  <span className={`mr-3 text-xs font-bold font-orbitron transition-colors ${isAllRoles ? 'text-[#dcb06b]' : 'text-[#4a5f78]'}`}>All Roles</span>
                  <input type="checkbox" className="hidden" checked={isAllRoles} onChange={e => setIsAllRoles(e.target.checked)}/>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${isAllRoles ? 'bg-[#dcb06b]' : 'bg-[#1e3a5f]'}`}>
                     <div className={`absolute top-1 w-3 h-3 rounded-full bg-white transition-transform ${isAllRoles ? 'left-6' : 'left-1'}`}></div>
                  </div>
                </label>
              </div>
              <div className={`flex flex-wrap gap-2 ${isAllRoles ? 'opacity-30 pointer-events-none' : ''}`}>
                {(isCoachMode ? [...ROLES_ORDER, Role.COACH] : ROLES_ORDER).map(role => (
                  <button key={role} type="button" onClick={() => toggleRole(role)} className={`px-4 py-2 font-cinzel font-bold text-[10px] uppercase tracking-widest clip-corner-sm border transition-all ${selectedRoles.includes(role) ? 'bg-[#dcb06b] text-[#05090f] border-[#dcb06b] shadow-[0_0_10px_#dcb06b]' : 'text-[#8a9db8] border-[#1e3a5f] hover:border-[#dcb06b] hover:text-[#dcb06b]'}`}>
                    {role.replace(' Lane', '')}
                  </button>
                ))}
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={!name || (!isAllRoles && selectedRoles.length === 0)}>Join Lobby</Button>
          </form>
        ) : (
          <form onSubmit={parseAndSubmitSmartInput}>
            <div className="mb-4">
              <label className="block text-[10px] uppercase tracking-widest text-[#8a9db8] mb-2 font-bold">Paste Roster List</label>
              <textarea value={smartInput} onChange={e => setSmartInput(e.target.value)} placeholder={smartPlaceholder} className="w-full h-56 bg-[#05090f] border border-[#1e3a5f] p-4 text-[#f0f4f8] placeholder-[#2d4a6d] focus:outline-none focus:border-[#dcb06b] clip-corner-sm font-orbitron text-[10px] leading-relaxed resize-none"/>
            </div>
            <Button type="submit" className="w-full" disabled={!smartInput.trim()}>Process Batch</Button>
          </form>
        )}
      </div>
    </div>
  );
};
