import React, { useState, useEffect } from 'react';
import { Player, Role } from '../types';
import { Button } from './Button';
import { ROLES_ORDER, RoleIcons } from '../constants';

interface EditPlayerModalProps {
  player: Player;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedPlayer: Player) => void;
}

export const EditPlayerModal: React.FC<EditPlayerModalProps> = ({ player, isOpen, onClose, onSave }) => {
  const [name, setName] = useState(player.name);
  const [discordName, setDiscordName] = useState(player.discordName || '');
  const [isAllRoles, setIsAllRoles] = useState(player.isAllRoles);
  const [selectedRoles, setSelectedRoles] = useState<Role[]>(player.roles);
  const [isCaptain, setIsCaptain] = useState(player.isCaptain || false);

  // Sync state when player prop changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setName(player.name);
      setDiscordName(player.discordName || '');
      setIsAllRoles(player.isAllRoles);
      setSelectedRoles(player.roles);
      setIsCaptain(player.isCaptain || false);
    }
  }, [player, isOpen]);

  if (!isOpen) return null;

  const toggleRole = (role: Role) => {
    if (isAllRoles) return;
    
    const nextRoles = selectedRoles.includes(role) 
        ? selectedRoles.filter(r => r !== role) 
        : [...selectedRoles, role];
    
    // Check if all 5 standard roles are selected
    const isFullSet = ROLES_ORDER.every(r => nextRoles.includes(r));

    if (isFullSet) {
        setIsAllRoles(true);
        setSelectedRoles([]);
    } else {
        setSelectedRoles(nextRoles);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      ...player,
      name,
      discordName: discordName.trim() || undefined,
      isAllRoles,
      roles: isAllRoles ? [] : selectedRoles,
      isCaptain
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose}></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-lg bg-[#0a1a2f] border border-[#dcb06b] clip-corner-md shadow-[0_0_50px_rgba(0,0,0,0.8)] animate-slide-in">
        
        {/* Header */}
        <div className="bg-[#05090f] p-4 border-b border-[#1e3a5f] flex justify-between items-center">
          <h3 className="text-[#dcb06b] font-cinzel font-bold text-lg tracking-widest flex items-center gap-2">
            <span className="w-1.5 h-5 bg-[#dcb06b] skew-x-[-12deg]"></span>
            EDIT CHALLENGER
          </h3>
          <button onClick={onClose} className="text-[#4a5f78] hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6">
          <form onSubmit={handleSave}>
            <div className="mb-4">
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#8a9db8] mb-2 font-bold">Discord Nickname (Optional)</label>
              <div className="relative">
                 <input 
                  type="text" 
                  value={discordName}
                  onChange={e => setDiscordName(e.target.value)}
                  className="w-full bg-[#05090f] border border-[#1e3a5f] p-3 text-[#f0f4f8] focus:outline-none focus:border-[#dcb06b] transition-all clip-corner-sm font-orbitron tracking-wide"
                />
                <div className="absolute right-0 bottom-0 h-2 w-2 border-b border-r border-[#dcb06b] pointer-events-none"></div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-[10px] uppercase tracking-[0.2em] text-[#8a9db8] mb-2 font-bold">Player Name</label>
              <div className="relative">
                 <input 
                  type="text" 
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="w-full bg-[#05090f] border border-[#1e3a5f] p-3 text-[#f0f4f8] focus:outline-none focus:border-[#dcb06b] transition-all clip-corner-sm font-orbitron tracking-wide"
                />
                <div className="absolute right-0 bottom-0 h-2 w-2 border-b border-r border-[#dcb06b] pointer-events-none"></div>
              </div>
            </div>

            <div className="mb-6 flex items-center justify-between">
              <label className="text-[10px] uppercase tracking-[0.2em] text-[#8a9db8] font-bold">Captain Status</label>
              <label className="flex items-center cursor-pointer group/toggle">
                <span className={`mr-3 text-xs font-bold transition-colors uppercase ${isCaptain ? 'text-purple-400' : 'text-[#4a5f78]'}`}>
                  {isCaptain ? 'Captain' : 'Normal'}
                </span>
                <div className={`w-10 h-5 rounded-full relative transition-colors ${isCaptain ? 'bg-purple-500' : 'bg-[#1e3a5f]'}`}>
                   <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${isCaptain ? 'left-6' : 'left-1'}`}></div>
                </div>
                <input 
                  type="checkbox" 
                  className="hidden"
                  checked={isCaptain}
                  onChange={e => setIsCaptain(e.target.checked)}
                />
              </label>
            </div>

            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                 <label className="text-[10px] uppercase tracking-[0.2em] text-[#8a9db8] font-bold">Roles</label>
                 <label className="flex items-center cursor-pointer group/toggle">
                  <span className={`mr-3 text-xs font-bold transition-colors uppercase ${isAllRoles ? 'text-[#dcb06b]' : 'text-[#4a5f78]'}`}>
                    Fill / All Roles
                  </span>
                  <div className={`w-10 h-5 rounded-full relative transition-colors ${isAllRoles ? 'bg-[#dcb06b]' : 'bg-[#1e3a5f]'}`}>
                     <div className={`absolute top-1 w-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${isAllRoles ? 'left-6' : 'left-1'}`}></div>
                  </div>
                  <input 
                    type="checkbox" 
                    className="hidden"
                    checked={isAllRoles}
                    onChange={e => setIsAllRoles(e.target.checked)}
                  />
                </label>
              </div>

              {/* Grid Updated for Flexible Widths */}
              <div className={`grid grid-cols-2 sm:grid-cols-3 gap-2 transition-all duration-300 ${isAllRoles ? 'opacity-40 pointer-events-none grayscale' : 'opacity-100'}`}>
                {ROLES_ORDER.map(role => (
                  <button
                    key={role}
                    type="button"
                    onClick={() => toggleRole(role)}
                    className={`group relative flex flex-col items-center justify-center p-2 h-auto py-3 clip-corner-sm transition-all duration-200 border border-transparent ${
                      selectedRoles.includes(role) 
                        ? 'bg-[#1e3a5f] border-[#dcb06b] shadow-[0_0_10px_rgba(220,176,107,0.2)]' 
                        : 'bg-[#05090f] hover:bg-[#0f223d] hover:border-[#1e3a5f]'
                    }`}
                  >
                    <div className={`transform ${selectedRoles.includes(role) ? 'text-[#dcb06b]' : 'text-[#4a5f78]'}`}>
                      {RoleIcons[role]}
                    </div>
                    {selectedRoles.includes(role) && (
                       <div className="absolute top-0 right-0 w-2 h-2 bg-[#dcb06b] clip-corner-sm"></div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex gap-4">
               <Button type="button" variant="secondary" onClick={onClose} className="w-1/2">
                  Cancel
               </Button>
               <Button type="submit" className="w-1/2">
                  Save Changes
               </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};