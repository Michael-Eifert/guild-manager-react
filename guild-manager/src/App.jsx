import React, { useState, useEffect, useRef } from 'react';
import { CONFIG, INITIAL_MISSIONS, DB_CLASSES, PROF_ACTIONS, DB_ITEMS } from './constants';
import { getReqExp, generateCharacter, getQualityClass, getSkillCap, getAutoSkillTarget, getNextTierLevel, getRoleIcon, getRaceIcon, createId } from './utils';
import { CharacterCard, DetailModal } from './components/GameComponents';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY || "";
const callGemini = async (prompt, isJson = false) => {
    try {
        if (!apiKey) {
            throw new Error("Missing VITE_GEMINI_API_KEY");
        }
        const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${apiKey}`;
        const body = { contents: [{ parts: [{ text: prompt }] }] };
        if (isJson) body.generationConfig = { responseMimeType: "application/json" };
        const response = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
        if (!response.ok) throw new Error(`Gemini API Error: ${response.status}`);
        const data = await response.json();
        if (!data.candidates || data.candidates.length === 0) throw new Error("No candidates returned");
        const text = data.candidates[0].content.parts[0].text;
        return isJson ? JSON.parse(text) : text;
    } catch (error) { console.error("Gemini Call Failed:", error); throw error; }
};

// --- Loot Logic (Dependencies on DB_ITEMS/DB_CLASSES) ---
const generatePersonalLoot = (mission, char) => {
    const isDungeon = mission.type === 'dungeon';
    const dropChance = isDungeon ? 1.0 : 0.5; 
    if (Math.random() > dropChance) return null;
    
    const classInfo = DB_CLASSES[char.charClass];
    if (!classInfo) return null;
    
    const profs = classInfo.proficiencies;
    const targetQuality = isDungeon ? 2 : 1; 

    const possibleItems = DB_ITEMS.filter(item => {
        const levelOK = item.minLevel <= (char.level + 2) && item.minLevel >= (mission.level - 5);
        const typeOK = item.type === 'Generic' || profs.includes(item.type);
        let qualityOK = item.quality === targetQuality;
        if(!isDungeon && Math.random() < 0.1) qualityOK = item.quality === 2;
        return levelOK && typeOK && qualityOK;
    });

    if (possibleItems.length === 0) return null;
    return possibleItems[Math.floor(Math.random() * possibleItems.length)];
};

const generateBossLoot = (mission, partyMembers) => {
    if (mission.type !== 'dungeon') return null;
    if (Math.random() > 0.2) return null; 
    const blueItems = DB_ITEMS.filter(i => i.quality === 3);
    if (blueItems.length === 0) return null;
    const loot = blueItems[Math.floor(Math.random() * blueItems.length)];
    
    const eligible = partyMembers.filter(c => {
        const info = DB_CLASSES[c.charClass];
        if (!info) return false;
        const profs = info.proficiencies;
        return loot.type === 'Generic' || profs.includes(loot.type);
    });
    
    if (eligible.length === 0) return null;
    const winner = eligible[Math.floor(Math.random() * eligible.length)];
    return { loot, winnerId: winner.id };
};

// --- Missing Modal Components (Defined here for portability) ---

const RecruitModal = ({ isOpen, onClose, onRecruit }) => {
    const [candidates, setCandidates] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    useEffect(() => { 
        if (isOpen) { 
            setIsLoading(true); 
            setCandidates([]); 
            const timer = setTimeout(() => { 
                setCandidates([generateCharacter(), generateCharacter(), generateCharacter()]); 
                setIsLoading(false); 
            }, 1000); 
            return () => clearTimeout(timer); 
        } 
    }, [isOpen]);
    
    if (!isOpen) return null;
    
    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4">
            <div className="bg-gray-900 border-x-0 border-y-0 md:border-2 border-yellow-700 rounded-none md:rounded-lg w-full max-w-3xl h-full md:h-auto overflow-y-auto relative">
                <button onClick={onClose} className="absolute top-2 right-4 text-gray-500 hover:text-white text-3xl z-10">&times;</button>
                <div className="p-6">
                    {isLoading ? <div className="text-center py-20"><div className="text-6xl mb-4 animate-bounce">🔍</div><h2 className="text-2xl fantasy-font text-yellow-500">Scouting...</h2></div> : (<div><h2 className="text-2xl text-center mb-6 fantasy-font mt-8 md:mt-0">Applicants Found</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">{candidates.map((char) => (<div key={char.id} onClick={() => onRecruit(char)} className="bg-gray-800 p-4 rounded flex flex-col items-center text-center cursor-pointer border border-transparent hover:border-yellow-500 hover:bg-gray-700 transition-all active:scale-95"><div className="text-4xl mb-2">{getRaceIcon(char.race)}</div><div className="font-bold text-lg" style={{ color: DB_CLASSES[char.charClass] ? DB_CLASSES[char.charClass].color : '#fff' }}>{char.name}</div><div className="text-sm text-gray-400 mb-2">{char.race} {char.charClass}</div><div className="text-xs text-gray-500 mb-4 flex items-center gap-1">Role: <span className="text-white">{char.role}</span> {getRoleIcon(char.role)}</div><button className="mt-auto px-4 py-2 border border-gray-600 rounded text-xs uppercase tracking-wider text-green-400 hover:bg-green-900 w-full md:w-auto">Recruit</button></div>))}</div><div className="text-center"><button onClick={onClose} className="text-red-400 text-sm hover:text-white border-b border-red-900 p-2">Reject All</button></div></div>)}
                </div>
            </div>
        </div>
    );
};

const MissionModal = ({ isOpen, onClose, roster, onDeploy, missionList, onAddMissions }) => {
    const [view, setView] = useState('list');
    const [selectedQuest, setSelectedQuest] = useState(null);
    const [party, setParty] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);

    useEffect(() => { if (isOpen) { setView('list'); setParty([]); setSelectedQuest(null); } }, [isOpen]);
    if (!isOpen) return null;
    
    const handleSelectQuest = (q) => { setSelectedQuest(q); setView('prep'); setParty([]); };
    const toggleMember = (charId) => { if (party.includes(charId)) setParty(party.filter(id => id !== charId)); else if (party.length < 5) setParty([...party, charId]); };
    const minLevel = selectedQuest ? (selectedQuest.minLevel || Math.max(1, selectedQuest.level - 6)) : 1;
    const idleRoster = roster.filter(c => c.status === 'Idle' || c.status.includes('Mining') || c.status.includes('Herbs') || c.status.includes('Skinning') || c.status.includes('Forging') || c.status.includes('Stitching') || c.status.includes('Weaving') || c.status.includes('Disenchanting') || c.status.includes('Brewing'));

    const handleGenMissions = async () => {
        setIsGenerating(true);
        try {
            const prompt = "Generate 3 unique, flavor-filled fantasy RPG missions. Return ONLY a JSON array.";
            const generatedMissions = await callGemini(prompt, true);
            const safeMissions = Array.isArray(generatedMissions) ? generatedMissions : [];
            const processed = safeMissions.map(m => ({ ...m, id: createId(), level: m.level || 5, duration: m.duration || 30, exp: m.exp || 500, elite: !!m.elite, type: m.type || 'quest' }));
            onAddMissions(processed);
        } catch (e) { alert("The Oracle is silent."); }
        setIsGenerating(false);
    };

    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4">
            <div className="bg-gray-900 border-x-0 border-y-0 md:border-2 border-blue-900 rounded-none md:rounded-lg w-full max-w-4xl h-full md:h-[80vh] flex flex-col relative shadow-2xl">
                <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center flex-none"><h2 className="text-xl md:text-2xl fantasy-font text-blue-400">{view === 'list' ? 'Mission Board' : 'Tactical Map'}</h2><button onClick={onClose} className="text-gray-500 hover:text-white text-3xl px-2">&times;</button></div>
                {view === 'list' && (
                    <div className="flex-1 flex flex-col min-h-0">
                        <div className="p-2 bg-gray-800 border-b border-gray-700 flex justify-center">
                            <button onClick={handleGenMissions} disabled={isGenerating} className={`w-full md:w-auto px-6 py-2 rounded font-bold transition-all flex items-center justify-center gap-2 ${isGenerating ? 'bg-purple-900/50 text-gray-400' : 'bg-purple-900 hover:bg-purple-700 text-purple-100 border border-purple-500'}`}>{isGenerating ? 'Consulting Oracle...' : '✨ Consult Oracle'}</button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                            {missionList.map(m => (<div key={m.id} onClick={() => handleSelectQuest(m)} className={`p-4 rounded cursor-pointer flex justify-between items-center bg-gray-800 active:bg-gray-700 hover:translate-x-1 transition-transform border border-transparent hover:border-blue-500 ${m.type === 'dungeon' ? 'border-l-4 border-l-blue-600' : ''}`}><div className="flex items-center gap-3"><div className="text-2xl bg-gray-900 w-10 h-10 flex items-center justify-center rounded border border-gray-700">{m.type === 'dungeon' ? '🏰' : '📜'}</div><div><div className={`font-bold text-lg ${m.elite ? 'text-yellow-500' : 'text-gray-200'}`}>{m.name}</div><div className="text-sm text-gray-500">{m.type === 'dungeon' ? 'Dungeon' : 'Quest'} • Lvl {m.level} • {m.duration}s</div></div></div></div>))}
                        </div>
                    </div>
                )}
                {view === 'prep' && selectedQuest && (<div className="flex-1 flex flex-col min-h-0 bg-gray-800"><div className="bg-gray-900 p-4 md:p-6 border-b border-gray-700 flex-none shadow-md"><div className="flex justify-between items-start mb-2"><div><h2 className={`text-xl md:text-2xl fantasy-font ${selectedQuest.elite ? 'text-yellow-500' : 'text-white'}`}>{selectedQuest.name}</h2></div><div className="text-right flex-none"><div className="text-xs md:text-sm text-gray-400 mb-1">Squad</div><div className="text-xl font-bold text-white">{party.length}/5</div></div></div></div><div className="flex-1 overflow-y-auto p-4 bg-gray-800 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 custom-scrollbar">{idleRoster.map(char => {const isEligible = char.level >= minLevel; const isSelected = party.includes(char.id); return (<div key={char.id} onClick={() => isEligible && toggleMember(char.id)} className={`p-3 rounded flex items-center gap-3 transition-all cursor-pointer border ${!isEligible ? 'opacity-40 cursor-not-allowed bg-black border-transparent' : isSelected ? 'bg-green-900/30 border-green-500' : 'bg-gray-700 border-gray-600 hover:bg-gray-600'}`}><div className="text-2xl bg-gray-900 w-10 h-10 flex items-center justify-center rounded border border-gray-600">{getRaceIcon(char.race)}</div><div className="flex-1"><div className="font-bold text-sm" style={{ color: DB_CLASSES[char.charClass].color }}>{char.name}</div><div className="flex justify-between items-center mt-1"><span className="text-xs text-gray-400">{getRoleIcon(char.role)} Lvl {char.level}</span>{!isEligible && <span className="text-[10px] text-red-500 font-bold uppercase">LOW</span>}</div></div>{isSelected && <div className="w-4 h-4 rounded-full bg-green-500"></div>}</div>)})}</div><div className="p-4 border-t border-gray-700 bg-gray-900 flex justify-between items-center flex-none"><button onClick={() => setView('list')} className="text-gray-400 hover:text-white text-sm md:text-base">← Back</button><button onClick={() => { onDeploy(selectedQuest, party); onClose(); }} disabled={party.length === 0} className="btn-quest px-6 md:px-10 py-3 rounded text-blue-100 font-bold disabled:opacity-50 disabled:cursor-not-allowed text-sm md:text-base">Deploy</button></div></div>)}
            </div>
        </div>
    );
};

const ActiveMissionCard = ({ mission, onFinish }) => {
    const now = Date.now();
    const timeLeft = Math.max(0, mission.finishTime - now);
    const progress = 100 - ((timeLeft / mission.totalDuration) * 100);
    return (
        <div className="p-3 rounded flex flex-col gap-2 shadow-lg relative overflow-hidden border border-gray-600 bg-gray-800">
            <div className="flex justify-between items-center z-10 relative">
                <span className="font-bold text-sm text-white flex items-center gap-1">{mission.type === 'dungeon' ? '🏰' : '📜'} {mission.name}</span>
                <span className="text-xs text-gray-400">{Math.ceil(timeLeft / 1000)}s</span>
            </div>
            <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden z-10 relative"><div className="bg-blue-500 h-full transition-all duration-100 linear" style={{ width: `${progress}%` }}></div></div>
            <button onClick={() => onFinish(mission)} className="mt-1 text-[10px] uppercase font-bold tracking-wider bg-green-900/50 hover:bg-green-700 text-green-100 px-3 py-2 rounded border border-green-800 transition-colors shadow-sm active:scale-95">⚡ Instant Finish</button>
        </div>
    );
};

const LootTableModal = ({ isOpen, onClose }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4">
                <div className="bg-gray-900 border-2 border-yellow-700 rounded-lg p-4 max-w-lg w-full text-center">
                <h2 className="text-xl font-bold mb-4">Loot Database</h2>
                <p className="text-gray-400 italic">Database access connected. (Visualized in main app flow)</p>
                <button onClick={onClose} className="mt-4 px-4 py-2 bg-gray-700 rounded">Close</button>
                </div>
        </div>
    );
};

const GuildLogModal = ({ isOpen, onClose, logs }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4">
            <div className="bg-gray-900 border-x-0 border-y-0 md:border-2 border-gray-600 rounded-none md:rounded-lg w-full max-w-2xl h-full md:h-[80vh] flex flex-col relative shadow-2xl">
                <div className="p-4 border-b border-gray-700 flex justify-between items-center bg-gray-900 z-10"><h2 className="text-xl md:text-2xl font-bold text-white fantasy-font">Guild Log</h2><button onClick={onClose} className="text-gray-500 hover:text-white text-3xl px-2">&times;</button></div>
                <div className="flex-1 overflow-y-auto p-4 space-y-2 custom-scrollbar font-mono text-sm">
                    {logs.length === 0 ? (
                        <div className="text-gray-500 italic text-center py-10">No events yet.</div>
                    ) : (
                        logs.map((log, i) => (
                            <div key={i} className="border-l-2 border-gray-700 pl-3 py-1 text-gray-300">
                                <span className="text-xs text-gray-500 block">{log.time}</span>
                                <span>
                                    <strong>{log.characterName}</strong> received{" "}
                                    <span className={getQualityClass(log.itemQuality)}>[{log.itemName}]</span> from {log.missionName}.
                                </span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

const DebugModal = ({ isOpen, onClose, onBulkLevel }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border-2 border-red-900 rounded-lg max-w-md w-full relative shadow-2xl">
                <div className="p-4 border-b border-gray-700 bg-gray-900 flex justify-between items-center rounded-t-lg">
                    <h2 className="text-xl font-bold text-red-500 fantasy-font">Debug Menu</h2>
                    <button onClick={onClose} className="text-gray-500 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-6 space-y-6">
                    <div>
                        <h3 className="text-gray-400 text-sm uppercase tracking-wider mb-3">Global Level Override</h3>
                        <div className="grid grid-cols-2 gap-3">
                            <button onClick={() => onBulkLevel(1)} className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-green-400 font-bold text-sm">+1 Level All</button>
                            <button onClick={() => onBulkLevel(5)} className="bg-gray-800 hover:bg-gray-700 border border-gray-600 rounded py-2 px-4 text-green-400 font-bold text-sm">+5 Level All</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};


// --- MAIN APP COMPONENT ---

const App = () => {
    const [roster, setRoster] = useState([]);
    const [activeMissions, setActiveMissions] = useState([]);
    const [missionList, setMissionList] = useState(INITIAL_MISSIONS);
    const [guildLog, setGuildLog] = useState([]);
    const [isPaused, setIsPaused] = useState(false);
    const [showRecruit, setShowRecruit] = useState(false);
    const [showMissions, setShowMissions] = useState(false);
    const [showLootTable, setShowLootTable] = useState(false);
    const [showGuildLog, setShowGuildLog] = useState(false);
    const [showDebug, setShowDebug] = useState(false);
    const [detailCharId, setDetailCharId] = useState(null);

    const rosterRef = useRef(roster);
    const missionsRef = useRef(activeMissions);

    useEffect(() => { rosterRef.current = roster; }, [roster]);
    useEffect(() => { missionsRef.current = activeMissions; }, [activeMissions]);

    // Reusable Reward Logic
    const processMissionRewards = (mission, currentRoster) => {
        const dungeonBonusRoll = generateBossLoot(mission, currentRoster.filter(c => mission.memberIds.includes(c.id)));
        let missionLogs = [];
        const updatedRoster = currentRoster.map(c => {
            if (mission.memberIds.includes(c.id)) {
                let newExp = c.exp + mission.exp;
                let newLevel = c.level;
                let maxExp = getReqExp(newLevel);
                let leveledUp = false;
                while (newExp >= maxExp && newLevel < CONFIG.LEVEL_CAP) { 
                    newLevel++; newExp -= maxExp; maxExp = getReqExp(newLevel); leveledUp = true; 
                }
                if (newLevel >= CONFIG.LEVEL_CAP) { newLevel = CONFIG.LEVEL_CAP; newExp = maxExp; }
                
                let newEquipment = { ...c.equipment };
                let historyEntry = { name: mission.name, type: mission.type, exp: mission.exp, time: new Date().toLocaleTimeString(), loot: null };
                
                let lootItem = null;
                if (dungeonBonusRoll && dungeonBonusRoll.winnerId === c.id) {
                    lootItem = dungeonBonusRoll.loot;
                } else {
                    lootItem = generatePersonalLoot(mission, c);
                }

                if (lootItem) {
                        const currentItem = newEquipment[lootItem.slot];
                        if (!currentItem || lootItem.quality > currentItem.quality) {
                            newEquipment[lootItem.slot] = lootItem;
                            historyEntry.loot = lootItem;
                            missionLogs.push({
                                characterName: c.name,
                                itemName: lootItem.name,
                                itemQuality: lootItem.quality,
                                missionName: mission.name,
                            });
                        }
                }

                // IMPORTANT: Set Status back to Idle immediately!
                return { 
                    ...c, 
                    status: 'Idle', 
                    statusText: 'Returning from Mission...',
                    level: newLevel, 
                    exp: newExp, 
                    maxExp, 
                    lastLevelUp: leveledUp ? Date.now() : c.lastLevelUp, 
                    history: [historyEntry, ...c.history],
                    equipment: newEquipment
                };
            }
            return c;
        });
        return { updatedRoster, missionLogs };
    };

    // --- GAME LOOP ---
    useEffect(() => {
        const tick = setInterval(() => {
            if (isPaused) return;
            
            const now = Date.now();
            const currentRoster = rosterRef.current;
            const currentMissions = missionsRef.current;
            
            let newRoster = [...currentRoster];
            let newMissions = [];
            let finishedMissions = [];
            let newLogs = [];

            // 1. Separate Missions
            currentMissions.forEach(m => {
                if (m.finishTime <= now) finishedMissions.push(m);
                else newMissions.push(m);
            });

            // 2. Process Finished Missions (Fixes "Stuck" Issue)
            finishedMissions.forEach(m => {
                const result = processMissionRewards(m, newRoster);
                newRoster = result.updatedRoster;
                newLogs = [...newLogs, ...result.missionLogs];
            });

            // 3. Process Character Status (Idle/Professions)
            newRoster = newRoster.map(char => {
                if (char.status === 'Questing') return char;

                let statusText = 'Resting...';
                let gainXP = false;
                let gainSkill = false;

                const hardCap = getSkillCap(char.level);
                const autoTarget = getAutoSkillTarget(char.level);
                const canGainSkill = char.professions.some(p => p.skill < hardCap);
                const needsAutoSkill = char.professions.some(p => p.skill < autoTarget);
                const isCheckpointLevel = char.level % 5 === 0;

                if (char.activityMode === 'Leveling') {
                    if (char.level < CONFIG.LEVEL_CAP) { gainXP = true; statusText = '⚔️ Grinding XP...'; }
                    else { statusText = 'Max Level Reached'; }
                } 
                else if (char.activityMode === 'Professions') {
                    if (canGainSkill) { gainSkill = true; }
                    else { statusText = 'Skills Capped (Need Level ' + getNextTierLevel(char.level) + ')'; }
                }
                else if (char.activityMode === 'Auto') {
                    if (isCheckpointLevel && needsAutoSkill) {
                        gainSkill = true;
                        statusText = '🤖 Auto: Skilling to ' + autoTarget + '...';
                    } else if (char.level < CONFIG.LEVEL_CAP) {
                        gainXP = true;
                        statusText = '⚔️ Auto: Leveling...';
                    } else if (canGainSkill && char.level >= CONFIG.LEVEL_CAP) {
                            // At max level, just skill to hard cap
                            gainSkill = true;
                            statusText = '🤖 Auto: Max Level Skilling...';
                    } else {
                        statusText = 'Awaiting Orders';
                    }
                }

                if (gainXP) {
                    const expGain = 20 + (char.level * 4);
                    let newExp = char.exp + expGain;
                    let newLevel = char.level;
                    let maxExp = getReqExp(newLevel);
                    let leveledUp = false;
                    while (newExp >= maxExp && newLevel < CONFIG.LEVEL_CAP) { 
                        newLevel++; newExp -= maxExp; maxExp = getReqExp(newLevel); leveledUp = true; 
                    }
                    if (newLevel >= CONFIG.LEVEL_CAP) { newLevel = CONFIG.LEVEL_CAP; newExp = maxExp; }
                    return { ...char, level: newLevel, exp: newExp, maxExp, statusText, lastLevelUp: leveledUp ? Date.now() : char.lastLevelUp };
                }

                if (gainSkill) {
                        // Determine cap based on mode
                    const currentLimit = (char.activityMode === 'Auto' && isCheckpointLevel && needsAutoSkill) ? autoTarget : hardCap;
                    
                    const uncappedProfs = char.professions.filter(p => p.skill < currentLimit && p.skill < 300);
                    
                    if (uncappedProfs.length > 0) {
                        const targetProfIndex = Math.floor(Math.random() * uncappedProfs.length);
                        const realIndex = char.professions.indexOf(uncappedProfs[targetProfIndex]);
                        const pName = char.professions[realIndex].name;
                        statusText = PROF_ACTIONS[pName] || `Working on ${pName}...`;

                        if (Math.random() > 0.3) {
                            const newProfs = [...char.professions];
                            newProfs[realIndex] = { ...newProfs[realIndex], skill: newProfs[realIndex].skill + 1 };
                            return { ...char, professions: newProfs, statusText };
                        }
                    }
                }

                return { ...char, statusText };
            });

            setRoster(newRoster);
            setActiveMissions(newMissions);
            
            if (newLogs.length > 0) {
                const time = new Date().toLocaleTimeString();
                setGuildLog(prev => [...newLogs.map(log => ({ time, ...log })), ...prev].slice(0, 50));
            }

        }, CONFIG.TICK_RATE);
        return () => clearInterval(tick);
    }, [isPaused]);

    const handleRecruit = (char) => {
        setRoster(prev => prev.length >= CONFIG.MAX_ROSTER ? prev : [...prev, char]);
        setShowRecruit(false);
    };
    const handleDismiss = (id) => { setRoster(p => p.filter(c => c.id !== id)); setDetailCharId(null); };
    const handleModeChange = (id, mode) => { setRoster(p => p.map(c => c.id !== id ? c : { ...c, activityMode: mode })); };
    const handleProfChange = (id, idx, newProf) => {
        setRoster(p => p.map(c => {
            if (c.id !== id) return c;
            const newProfs = [...c.professions];
            newProfs[idx] = { name: newProf, skill: 1 };
            return { ...c, professions: newProfs };
        }));
    };
    const handleUpdateBackstory = (charId, story) => { setRoster(p => p.map(c => c.id !== charId ? c : { ...c, backstory: story })); };
    const handleGenerateBackstory = async (char) => {
        try {
            const prompt = `Write a short, engaging 2-sentence fantasy backstory for a level ${char.level} ${char.race} ${char.charClass} named ${char.name}. They are a member of the 'Alliance Vanguard' guild.`;
            return await callGemini(prompt, false);
        } catch (error) {
            alert("Oracle is meditating. Add VITE_GEMINI_API_KEY and try again.");
            return null;
        }
    };
    const handleAddMissions = (newMissions) => { setMissionList(prev => [...prev, ...newMissions]); };
    const handleDeploy = (quest, ids) => {
        const startTime = Date.now();
        setRoster(prev => prev.map(c => ids.includes(c.id) ? { ...c, status: 'Questing', statusText: 'On Mission' } : c));
        setActiveMissions(prev => [...prev, { ...quest, questId: quest.id, startTime, finishTime: startTime + (quest.duration * 1000), totalDuration: quest.duration * 1000, memberIds: ids }]);
    };
    const handleManualFinish = (m) => {
        // Manually trigger the finish logic immediately (logic also exists in loop, but this is for instant feedback)
        // To avoid race conditions, we filter it out of activeMissions immediately
        setActiveMissions(prev => prev.filter(mi => mi !== m));
        setRoster(prevRoster => {
            const result = processMissionRewards(m, prevRoster);
            if(result.missionLogs.length > 0) {
                const time = new Date().toLocaleTimeString();
                setGuildLog(prev => [...result.missionLogs.map(log => ({ time, ...log })), ...prev].slice(0, 50));
            }
            return result.updatedRoster;
        });
    };
    
    // Fixed: Only level specific char if ID is provided, else bulk
    const handleLevelChange = (id, amt) => {
            setRoster(p => p.map(c => c.id !== id ? c : { ...c, level: Math.min(CONFIG.LEVEL_CAP, Math.max(1, c.level + amt)), exp: 0, maxExp: getReqExp(Math.min(CONFIG.LEVEL_CAP, Math.max(1, c.level + amt))) }));
    };

    const handleBulkLevel = (amt) => {
        setRoster(p => p.map(c => {
            const newLevel = Math.min(CONFIG.LEVEL_CAP, Math.max(1, c.level + amt));
            return { ...c, level: newLevel, exp: 0, maxExp: getReqExp(newLevel) };
        }));
        setShowDebug(false);
    };

    return (
        <div className="w-full max-w-5xl mx-auto p-4 pb-20">
            <header className="flex justify-between items-center mb-6 border-b border-gray-700 pb-4">
                <div><h1 className="text-xl md:text-3xl font-bold truncate">Alliance Manager</h1><p className="text-gray-400 text-xs md:text-sm">WoW Professions</p></div>
                <div className="text-right flex-none ml-2"><div className="text-sm md:text-xl fantasy-font">Mem: <span className={roster.length >= CONFIG.MAX_ROSTER ? 'text-red-500' : ''}>{roster.length}</span>/{CONFIG.MAX_ROSTER}</div><button onClick={() => setIsPaused(!isPaused)} className={`mt-2 px-3 py-1 rounded text-xs md:text-sm font-bold shadow border ${isPaused ? 'bg-gray-800 border-yellow-600 text-yellow-500' : 'bg-gray-800 border-gray-600 text-green-400'}`}>{isPaused ? '⏸' : '▶'}</button></div>
            </header>
            
            <div className="flex overflow-x-auto gap-3 mb-6 pb-2 no-scrollbar snap-x">
                <button onClick={() => setShowRecruit(true)} disabled={roster.length >= CONFIG.MAX_ROSTER} className="flex-none snap-start btn-recruit text-yellow-100 font-bold py-3 px-6 rounded border border-yellow-900 shadow-lg flex items-center gap-2 select-none disabled:opacity-50 whitespace-nowrap"><span className="text-xl">📜</span> Recruit</button>
                    <button onClick={() => setShowMissions(true)} className="flex-none snap-start btn-quest text-blue-100 font-bold py-3 px-6 rounded border border-blue-800 shadow-lg flex items-center gap-2 select-none whitespace-nowrap"><span className="text-xl">🛡️</span> Missions</button>
                <button onClick={() => setShowLootTable(true)} className="flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-gray-600 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap"><span className="text-xl">📖</span> DB</button>
                <button onClick={() => setShowGuildLog(true)} className="flex-none snap-start px-4 py-3 rounded bg-gray-800 border border-gray-600 hover:bg-gray-700 shadow flex items-center gap-2 whitespace-nowrap"><span className="text-xl">📜</span> Log</button>
                <button onClick={() => setShowDebug(true)} className="flex-none snap-start px-4 py-3 rounded bg-gray-900 border border-red-900 text-red-500 hover:bg-red-900/20 shadow flex items-center gap-2 whitespace-nowrap"><span className="text-xl">⚙️</span></button>
            </div>
            
            {activeMissions.length > 0 && <div className="mb-6"><h3 className="text-sm font-bold text-gray-400 mb-2 uppercase tracking-wider">Active</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4">{activeMissions.map((m) => <ActiveMissionCard key={`${m.questId}-${m.startTime}`} mission={m} onFinish={handleManualFinish} />)}</div></div>}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {roster.length === 0 ? <div className="text-gray-500 text-center col-span-full py-10 italic">Guild empty. Recruit heroes!</div> : roster.map(char => <CharacterCard key={char.id} char={char} onClick={() => setDetailCharId(char.id)} />)}
            </div>

            <RecruitModal isOpen={showRecruit} onClose={() => setShowRecruit(false)} onRecruit={handleRecruit} />
            <MissionModal isOpen={showMissions} onClose={() => setShowMissions(false)} roster={roster} onDeploy={handleDeploy} missionList={missionList} onAddMissions={handleAddMissions} />
            <LootTableModal isOpen={showLootTable} onClose={() => setShowLootTable(false)} />
            <GuildLogModal isOpen={showGuildLog} onClose={() => setShowGuildLog(false)} logs={guildLog} />
            <DebugModal isOpen={showDebug} onClose={() => setShowDebug(false)} onBulkLevel={handleBulkLevel} />
            <DetailModal char={roster.find(c => c.id === detailCharId)} isOpen={!!detailCharId} onClose={() => setDetailCharId(null)} onDismiss={handleDismiss} onModeChange={handleModeChange} onProfChange={handleProfChange} onGenerateBackstory={handleGenerateBackstory} onUpdateBackstory={handleUpdateBackstory} onLevelChange={handleLevelChange} onRoleChange={(id, role) => setRoster(p => p.map(c => c.id !== id ? c : { ...c, role }))} />
        </div>
    );
};

export default App;
