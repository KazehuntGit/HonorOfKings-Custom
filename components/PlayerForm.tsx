
import React, { useState } from 'react';
import { Player, Role } from '../types';
import { Button } from './Button';
import { ROLES_ORDER, RoleImagesNormal, RoleImagesActive } from '../constants';

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
  discordName?: string;
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
    
    // --- ARTIFACT CLEANING ---
    // Remove "Role icon, ..." formatting artifacts from Discord copy-paste
    // This handles: "Role icon, ╎GrandMaster", "Role icon, Gold", "Role icon, Server Booster" etc.
    let cleanedInput = smartInput.replace(/Role icon,\s*(?:╎\s*)?(?:Server\s*Booster|Grand\s*Master|Mythic|Legend|Master|Diamond|Platinum|Gold|Silver|Bronze)/gi, '');
    
    // Remove any remaining "Role icon" prefixes that might not have matched a specific rank
    cleanedInput = cleanedInput.replace(/^Role icon,?\s*/gim, '');

    const lines = cleanedInput.split(/\n/);
    const batchItems: BatchItem[] = [];
    
    // State to hold the most recently seen "Discord Name" (header line)
    let currentDiscordName = '';

    lines.forEach(line => {
      const cleanLine = line.trim();
      if (!cleanLine) return;
      
      // 1. DISCORD TIMESTAMP HEADER DETECTION
      // Matches formats like: "Moon — 2/5/2026", " - Today", "Name - Yesterday"
      // Captures the name part before the separator
      const timestampMatch = cleanLine.match(/^(.*?)(?:[\—\-]\s+)(?:Today|Yesterday|Tomorrow|\d{1,2}\/\d{1,2})/i);

      if (timestampMatch) {
          const possibleName = timestampMatch[1].trim();
          
          if (possibleName) {
              // Case: "Moon — 2/5/2026..." -> "Moon" is the discord name
              currentDiscordName = possibleName;
          } 
          // Case: " — 2/5/2026..." -> No name on this line. 
          // It relies on the previous line being the name (handled below).
          
          return; // This line is just metadata/header, not a player entry.
      }
      
      // 2. PARSE PLAYER INFO (IGN + ROLES)
      let pName = "";
      let pRoleStr = "";
      let hasRoleInfo = false;

      // SEPARATOR: Prioritize Colon (:)
      const colonIndex = cleanLine.indexOf(':');
      if (colonIndex !== -1) {
          pName = cleanLine.substring(0, colonIndex).trim();
          pRoleStr = cleanLine.substring(colonIndex + 1).trim().toLowerCase();
          hasRoleInfo = true;
      } else {
          // Fallback: Check for " - " (Dash with spaces)
          const dashMatch = cleanLine.match(/\s+-\s+/);
          if (dashMatch && dashMatch.index) {
             pName = cleanLine.substring(0, dashMatch.index).trim();
             pRoleStr = cleanLine.substring(dashMatch.index + dashMatch[0].length).trim().toLowerCase();
             hasRoleInfo = true;
          } else {
             // Edge Case: (All Roles) or (Fill) without separator
             if (cleanLine.toLowerCase().includes('(all roles)') || cleanLine.toLowerCase().includes('(fill)')) {
                pName = cleanLine.replace(/\(.*\)/, '').trim();
                pRoleStr = "all";
                hasRoleInfo = true;
             }
          }
      }

      // If this line does NOT look like a player entry (no role info found),
      // we assume it is a Discord Username header for the subsequent lines.
      // (Unless it was a timestamp line, which is caught above).
      if (!hasRoleInfo) {
          currentDiscordName = cleanLine;
          return;
      }

      if (!pName) return;

      let pIsAllRoles = false;
      const pRoles: Role[] = [];
      let pAction: 'add' | 'bench' = 'add';

      // 3. PARSE ROLES
      if (pRoleStr.includes('bench') || pRoleStr.includes('stop') || pRoleStr.includes('out') || pRoleStr.includes('afk')) {
         pAction = 'bench';
      } else {
         if (pRoleStr.includes('all') || pRoleStr.includes('fill') || pRoleStr.includes('any') || pRoleStr.includes('auto')) {
            pIsAllRoles = true;
         } else {
            if (/clash|exp|fight|clsh|top/i.test(pRoleStr)) pRoles.push(Role.CLASH);
            if (/jung|jg|assassin|hunt|core/i.test(pRoleStr)) pRoles.push(Role.JUNGLE);
            if (/mid|mage|central/i.test(pRoleStr)) pRoles.push(Role.MID);
            if (/farm|gold|mm|adc|archer|marksman|bot/i.test(pRoleStr)) pRoles.push(Role.FARM);
            if (/roam|supp|tank|helper|utility/i.test(pRoleStr)) pRoles.push(Role.ROAM);
            if (isCoachMode && /coach|trainer|mgr/i.test(pRoleStr)) pRoles.push(Role.COACH);
         }
      }
      
      if (pName && (pAction === 'bench' || pIsAllRoles || pRoles.length > 0)) {
        batchItems.push({ 
            name: pName, 
            discordName: currentDiscordName || undefined, // Attach the captured discord name
            isAllRoles: pIsAllRoles, 
            roles: pRoles, 
            action: pAction 
        });
        // We do NOT clear currentDiscordName here to allow multiple entries under one name.
      }
    });
    
    if (batchItems.length > 0) { 
      onBatchProcess(batchItems); 
      setSmartInput(''); 
    }
  };

  const smartPlaceholder = `--- DISCORD COPY-PASTE SUPPORTED ---
Flaxus
 — 2/12/2026 1:15
CraozZ: Mid, Farm

Zei
 — 2/12/2026 17:00
ZeiGoodman:Jungler/farm lane

Moon — 2/5/2026 7:30
Zorogentry : mid, mm

--- OTHER FORMATS ---
PlayerName - Role1, Role2
Player (All Roles)
Player: Bench`;

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
                {(isCoachMode ? [...ROLES_ORDER, Role.COACH] : ROLES_ORDER).map(role => {
                  const isSelected = selectedRoles.includes(role);
                  const activeIcon = RoleImagesActive[role];
                  const normalIcon = RoleImagesNormal[role];

                  return (
                    <button 
                      key={role} 
                      type="button" 
                      onClick={() => toggleRole(role)} 
                      className={`
                        px-4 py-2 font-cinzel font-bold text-[10px] uppercase tracking-widest clip-corner-sm border transition-all flex items-center gap-2 group
                        ${isSelected 
                          ? 'bg-[#dcb06b] text-[#05090f] border-[#dcb06b] shadow-[0_0_10px_#dcb06b]' 
                          : 'text-[#8a9db8] border-[#1e3a5f] hover:border-[#dcb06b] hover:text-[#dcb06b]'
                        }
                      `}
                    >
                      {/* Icon Display Logic:
                          - If selected: Show Active Icon
                          - If hovered: Show Active Icon (using group-hover via CSS logic not feasible with separate img sources easily, better to toggle visibility)
                          - Else: Show Normal Icon
                      */}
                      {activeIcon && normalIcon ? (
                        <div className="relative w-4 h-4 mr-1">
                           {/* Normal Icon: Visible when NOT selected AND NOT hovered */}
                           <img 
                             src={normalIcon} 
                             alt="" 
                             className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ${isSelected ? 'opacity-0' : 'opacity-100 group-hover:opacity-0'}`} 
                           />
                           {/* Active Icon: Visible when Selected OR Hovered */}
                           <img 
                             src={activeIcon} 
                             alt="" 
                             className={`absolute inset-0 w-full h-full object-contain transition-opacity duration-200 ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`} 
                           />
                        </div>
                      ) : null}
                      {role.replace(' Lane', '')}
                    </button>
                  );
                })}
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
