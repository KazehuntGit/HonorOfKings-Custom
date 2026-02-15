
import React from 'react';
import { Role } from './types';

export const ROLES_ORDER = [
  Role.CLASH,
  Role.JUNGLE,
  Role.MID,
  Role.FARM,
  Role.ROAM,
];

export const HOK_ITEM_TEAMS = [
  "Eternity (ETN) — Eternity Blade",
  "Shadow (SHD) — Shadow Ripper",
  "Daybreaker (DBK) — Daybreaker",
  "Doomsday (DMS) — Doomsday",
  "Bloodweeper (BWP) — Bloodweeper",
  "Mortal (MTL) — Mortal Punishment",
  "Sparkforged (SFG) — Sparkforged Dagger",
  "Axe (AXE) — Axe of Torment",
  "Destiny (DST) — Sage’s Destiny",
  "Twilight (TWL) — Twilight Bow",
  "Ominous (OMN) — Ominous Premonition",
  "Insatiable (IST) — Insatiable Tome",
  "Augury (AGR) — Augury's Staff",
  "Venom (VNM) — Venomous Staff",
  "Void (VOD) — Void Staff",
  "Moonbow (MNB) — Moonbow",
  "Glacial (GLC) — Glacial Buckler",
  "Sanctuary (SNC) — Sage’s Sanctuary",
  "Calamity (CLM) — Calamity Cape",
  "Guardian (GDN) — Longnight Guardian",
  "Blazing (BLZ) — Blazing Armor",
  "Cuirass (CRS) — Cuirass of Savagery",
  "Overlord (OVL) — Overlord's Platemail",
  "Radiant (RAD) — Radiant Dawn",
  "Frost (FRT) — Frostscar"
];

export const RoleImagesNormal: Record<Role, string | null> = {
  [Role.CLASH]: "https://www.honorofkings.com/img/hero_icon1.png",
  [Role.JUNGLE]: "https://www.honorofkings.com/img/hero_icon2.png",
  [Role.MID]: "https://www.honorofkings.com/img/hero_icon3.png",
  [Role.FARM]: "https://www.honorofkings.com/img/hero_icon4.png",
  [Role.ROAM]: "https://www.honorofkings.com/img/hero_icon5.png",
  [Role.COACH]: null,
};

export const RoleImagesActive: Record<Role, string | null> = {
  [Role.CLASH]: "https://www.honorofkings.com/img/hero_icon1_cur.png",
  [Role.JUNGLE]: "https://www.honorofkings.com/img/hero_icon2_cur.png",
  [Role.MID]: "https://www.honorofkings.com/img/hero_icon3_cur.png",
  [Role.FARM]: "https://www.honorofkings.com/img/hero_icon4_cur.png",
  [Role.ROAM]: "https://www.honorofkings.com/img/hero_icon5_cur.png",
  [Role.COACH]: null,
};

// Kept for backward compatibility, mapped to Active/Cur versions
export const RoleImages = RoleImagesActive;

// Now includes the Active Icon image alongside the text
export const RoleIcons: Record<Role, React.ReactNode> = {
  [Role.CLASH]: (
    <div className="flex items-center justify-center gap-1.5">
        <img src={RoleImagesActive[Role.CLASH]!} alt="" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
        <span className="font-orbitron font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">CLASH LANE</span>
    </div>
  ),
  [Role.JUNGLE]: (
    <div className="flex items-center justify-center gap-1.5">
        <img src={RoleImagesActive[Role.JUNGLE]!} alt="" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
        <span className="font-orbitron font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">JUNGLER</span>
    </div>
  ),
  [Role.MID]: (
    <div className="flex items-center justify-center gap-1.5">
        <img src={RoleImagesActive[Role.MID]!} alt="" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
        <span className="font-orbitron font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">MID LANE</span>
    </div>
  ),
  [Role.FARM]: (
    <div className="flex items-center justify-center gap-1.5">
        <img src={RoleImagesActive[Role.FARM]!} alt="" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
        <span className="font-orbitron font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">FARM LANE</span>
    </div>
  ),
  [Role.ROAM]: (
    <div className="flex items-center justify-center gap-1.5">
        <img src={RoleImagesActive[Role.ROAM]!} alt="" className="w-4 h-4 md:w-5 md:h-5 object-contain" />
        <span className="font-orbitron font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">ROAMER</span>
    </div>
  ),
  [Role.COACH]: (
    <div className="flex items-center justify-center gap-1.5">
        <span className="font-orbitron font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">COACH</span>
    </div>
  ),
};
