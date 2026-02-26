import { Mic, MicOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useEffect } from "react";

interface VoiceButtonProps {
  onTranscript: (text: string) => void;
  onInterim?: (text: string) => void;
  className?: string;
  size?: "sm" | "default" | "lg";
  variant?: "default" | "outline" | "ghost";
  showLabel?: boolean;
}

export function VoiceButton({
  onTranscript,
  onInterim,
  className = "",
  size = "default",
  variant = "outline",
  showLabel = false,
}: VoiceButtonProps) {
  const { isListening, isSupported, interimTranscript, toggleListening, error } =
    useVoiceInput({
      onResult: (text) => {
        onTranscript(text);
      },
      onInterim,
    });

  useEffect(() => {
    if (error) toast.error(error);
  }, [error]);

  if (!isSupported) return null;

  return (
    <div className={`relative inline-flex items-center gap-2 ${className}`}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={isListening ? "default" : variant}
            size={size === "sm" ? "icon" : size}
            onClick={toggleListening}
            className={`relative ${size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-9 w-9"} ${
              isListening
                ? "bg-red-500 hover:bg-red-600 text-white border-red-500"
                : ""
            }`}
          >
            {/* Pulsing rings when listening */}
            <AnimatePresence>
              {isListening && (
                <>
                  <motion.span
                    initial={{ scale: 1, opacity: 0.6 }}
                    animate={{ scale: 2, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut" }}
                    className="absolute inset-0 rounded-full bg-red-500/30"
                  />
                  <motion.span
                    initial={{ scale: 1, opacity: 0.4 }}
                    animate={{ scale: 1.6, opacity: 0 }}
                    transition={{ duration: 1.5, repeat: Infinity, ease: "easeOut", delay: 0.3 }}
                    className="absolute inset-0 rounded-full bg-red-500/20"
                  />
                </>
              )}
            </AnimatePresence>
            {isListening ? (
              <motion.div
                animate={{ scale: [1, 1.15, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
              >
                <Mic className={size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-4 w-4"} />
              </motion.div>
            ) : (
              <Mic className={size === "sm" ? "h-3.5 w-3.5" : size === "lg" ? "h-6 w-6" : "h-4 w-4"} />
            )}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top">
          <p className="text-xs">{isListening ? "Click to stop listening" : "Click to speak to Mia"}</p>
        </TooltipContent>
      </Tooltip>

      {showLabel && isListening && (
        <motion.span
          initial={{ opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -8 }}
          className="text-xs text-red-500 font-medium"
        >
          Listening...
        </motion.span>
      )}

      {/* Interim transcript floating indicator */}
      <AnimatePresence>
        {isListening && interimTranscript && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="absolute top-full left-0 mt-2 z-50 max-w-xs"
          >
            <div className="bg-popover text-popover-foreground border border-border rounded-lg px-3 py-2 shadow-lg">
              <p className="text-xs text-muted-foreground italic">"{interimTranscript}"</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/**
 * Inline voice button for use inside input fields / textareas
 */
export function VoiceInputButton({
  onTranscript,
  className = "",
}: {
  onTranscript: (text: string) => void;
  className?: string;
}) {
  return (
    <VoiceButton
      onTranscript={onTranscript}
      size="sm"
      variant="ghost"
      className={className}
    />
  );
}
