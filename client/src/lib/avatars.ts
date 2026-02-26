// ─── Avatar Options ─────────────────────────────────────────────────────────
// All 6 hyper-realistic avatar options with CDN URLs

export interface AvatarOption {
  id: string;
  name: string;
  description: string;
  imageUrl: string;
  gender: "female" | "male";
}

export const AVATAR_OPTIONS: AvatarOption[] = [
  {
    id: "option-1",
    name: "Aria",
    description: "Professional brunette with a warm, grounded presence",
    imageUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663316543184/kWIgiHlbzKJkUGOu.png",
    gender: "female",
  },
  {
    id: "option-2",
    name: "Mia",
    description: "Auburn-haired tech professional — confident and sharp",
    imageUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663316543184/kgeOWTiacrGPkfVZ.png",
    gender: "female",
  },
  {
    id: "option-3",
    name: "Lena",
    description: "Sleek bob, executive presence — empathetic and composed",
    imageUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663316543184/IFrokNiioSDcsxIc.png",
    gender: "female",
  },
  {
    id: "option-4",
    name: "Elise",
    description: "Elegant and composed — calm authority with a polished look",
    imageUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663316543184/NowgIVCLmBTUbmYY.png",
    gender: "female",
  },
  {
    id: "option-5",
    name: "Zara",
    description: "Dynamic and energetic — modern warmth and confidence",
    imageUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663316543184/olkoCvpqGhgqKWiS.png",
    gender: "female",
  },
  {
    id: "option-6",
    name: "Marcus",
    description: "Approachable professional — trustworthy and intelligent",
    imageUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663316543184/VbYmURmwHWMGmpNi.png",
    gender: "male",
  },
  {
    id: "option-mr-diff",
    name: "Mr Diff",
    description: "Grumpy veteran code reviewer — seen it all, trusts nothing",
    imageUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663316543184/HaPTGTaYCHjglyZs.png",
    gender: "male",
  },
  {
    id: "option-go4ai",
    name: "GO4Ai",
    description: "Impossibly friendly AI skills tracker — your neighborly learning companion",
    imageUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663316543184/zjsxDBAogbXPTdTE.png",
    gender: "male",
  },
  {
    id: "option-coach-byte",
    name: "Coach Byte",
    description: "Your high-energy AI usage performance coach — tracking reps, closing gaps",
    imageUrl: "https://files.manuscdn.com/user_upload_by_module/session_file/310519663316543184/ikTffzgdXrNUxNJJ.png",
    gender: "female",
  },
];

export const DEFAULT_AVATAR_ID = "option-2";

export function getAvatarById(id: string): AvatarOption {
  return AVATAR_OPTIONS.find((a) => a.id === id) ?? AVATAR_OPTIONS[1]; // default to option-2
}

export function getAvatarUrl(id: string): string {
  return getAvatarById(id).imageUrl;
}
