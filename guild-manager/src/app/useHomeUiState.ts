import { useState } from "react";

type HomeUiDefaults = {
  defaultDashboardSections: Record<string, boolean>;
  defaultRankingMode: string;
  defaultSortMode: string;
};

export const useHomeUiState = ({
  defaultDashboardSections,
  defaultRankingMode,
  defaultSortMode,
}: HomeUiDefaults) => {
  const [showRecruit, setShowRecruit] = useState(false);
  const [showLootTable, setShowLootTable] = useState(false);
  const [showGuildLog, setShowGuildLog] = useState(false);
  const [showProfessions, setShowProfessions] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [dashboardSectionsOpen, setDashboardSectionsOpen] = useState(defaultDashboardSections);
  const [detailCharId, setDetailCharId] = useState<string | null>(null);
  const [memberRankingMode, setMemberRankingMode] = useState(defaultRankingMode);
  const [guildMemberSearch, setGuildMemberSearch] = useState("");
  const [guildMemberMinLevelFilter, setGuildMemberMinLevelFilter] = useState("");
  const [guildMemberMaxLevelFilter, setGuildMemberMaxLevelFilter] = useState("");
  const [guildMemberSortMode, setGuildMemberSortMode] = useState(defaultSortMode);

  return {
    dashboardSectionsOpen,
    detailCharId,
    guildMemberMaxLevelFilter,
    guildMemberMinLevelFilter,
    guildMemberSearch,
    guildMemberSortMode,
    memberRankingMode,
    setDashboardSectionsOpen,
    setDetailCharId,
    setGuildMemberMaxLevelFilter,
    setGuildMemberMinLevelFilter,
    setGuildMemberSearch,
    setGuildMemberSortMode,
    setMemberRankingMode,
    setShowDebug,
    setShowGuildLog,
    setShowLootTable,
    setShowOptions,
    setShowProfessions,
    setShowRecruit,
    showDebug,
    showGuildLog,
    showLootTable,
    showOptions,
    showProfessions,
    showRecruit,
  };
};
