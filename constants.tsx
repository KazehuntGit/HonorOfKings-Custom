
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
  "Starshards (STS) — Starshards",
  "Bloodweeper (BWP) — Bloodweeper",
  "Mortal (MTL) — Mortal Punishment",
  "Sparkforged (SFG) — Sparkforged Dagger",
  "Axe (AXE) — Axe of Torment",
  "Destiny (DST) — Sage’s Destiny",
  "Savant (SVT) — Savant's Wrath",
  "Twilight (TWL) — Twilight Bow",
  "Ominous (OMN) — Ominous Premonition",
  "Styx (STX) — Styx's Omen",
  "Insatiable (IST) — Insatiable Tome",
  "Augury (AGR) — Augury's Staff",
  "Venom (VNM) — Venomous Staff",
  "Void (VOD) — Void Staff",
  "Moonbow (MNB) — Moonbow",
  "Glory (GLY) — Guardian’s Glory",
  "Glacial (GLC) — Glacial Buckler",
  "Sanctuary (SNC) — Sage’s Sanctuary",
  "Calamity (CLM) — Calamity Cape",
  "Guardian (GDN) — Longnight Guardian",
  "Blazing (BLZ) — Blazing Armor",
  "Cuirass (CRS) — Cuirass of Savagery",
  "Overlord (OVL) — Overlord's Platemail",
  "Radiant (RAD) — Radiant Dawn",
  "Frost (FRT) — Frostscar / Frostchase",
  "Aegis (AGS) — The Aegis"
];

// Changed from Icons to Text Labels as requested
export const RoleIcons: Record<Role, React.ReactNode> = {
  [Role.CLASH]: (
    <span className="font-orbitron font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">CLASH LANE</span>
  ),
  [Role.JUNGLE]: (
    <span className="font-orbitron font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">JUNGLER</span>
  ),
  [Role.MID]: (
    <span className="font-orbitron font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">MID LANE</span>
  ),
  [Role.FARM]: (
    <span className="font-orbitron font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">FARM LANE</span>
  ),
  [Role.ROAM]: (
    <span className="font-orbitron font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">ROAMER</span>
  ),
  [Role.COACH]: (
    <span className="font-orbitron font-bold uppercase tracking-widest text-[10px] md:text-xs whitespace-nowrap">COACH</span>
  ),
};
