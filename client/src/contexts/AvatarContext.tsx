import { createContext, useContext, useState, useEffect, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";
import { DEFAULT_AVATAR_ID, getAvatarById, type AvatarOption } from "@/lib/avatars";
import { setMiaGlobalConfig } from "@/components/Mia";

interface AvatarContextValue {
  avatarId: string;
  avatar: AvatarOption;
  agentName: string;
  voiceEnabled: boolean;
  setAvatarId: (id: string) => void;
  setAgentName: (name: string) => void;
  setVoiceEnabled: (enabled: boolean) => void;
  isLoading: boolean;
}

const AvatarContext = createContext<AvatarContextValue | null>(null);

export function AvatarProvider({ children }: { children: ReactNode }) {
  const [avatarId, setAvatarIdLocal] = useState(DEFAULT_AVATAR_ID);
  const [agentName, setAgentNameLocal] = useState("Mia");
  const [voiceEnabled, setVoiceEnabledLocal] = useState(true);

  const { data: settings, isLoading } = trpc.settings.get.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });

  const updateMutation = trpc.settings.update.useMutation();

  // Sync from server settings
  useEffect(() => {
    if (settings) {
      if (settings.avatarId) setAvatarIdLocal(settings.avatarId);
      if (settings.agentName) setAgentNameLocal(settings.agentName);
      if (typeof settings.voiceEnabled === "boolean") setVoiceEnabledLocal(settings.voiceEnabled);
    }
  }, [settings]);

  // Sync to Mia global config whenever local state changes
  useEffect(() => {
    const avatar = getAvatarById(avatarId);
    setMiaGlobalConfig(avatar.imageUrl, agentName, voiceEnabled);
  }, [avatarId, agentName, voiceEnabled]);

  const setAvatarId = (id: string) => {
    setAvatarIdLocal(id);
    updateMutation.mutate({ avatarId: id });
  };

  const setAgentName = (name: string) => {
    setAgentNameLocal(name);
    updateMutation.mutate({ agentName: name });
  };

  const setVoiceEnabled = (enabled: boolean) => {
    setVoiceEnabledLocal(enabled);
    updateMutation.mutate({ voiceEnabled: enabled });
  };

  return (
    <AvatarContext.Provider
      value={{
        avatarId,
        avatar: getAvatarById(avatarId),
        agentName,
        voiceEnabled,
        setAvatarId,
        setAgentName,
        setVoiceEnabled,
        isLoading,
      }}
    >
      {children}
    </AvatarContext.Provider>
  );
}

export function useAvatar() {
  const ctx = useContext(AvatarContext);
  if (!ctx) throw new Error("useAvatar must be used within AvatarProvider");
  return ctx;
}
