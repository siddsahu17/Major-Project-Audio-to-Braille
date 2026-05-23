import { useState } from "react";
import { Volume2, HelpCircle, Moon, Sun, Contrast } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "sonner";

const AccessibilityControls = () => {
  const { t } = useLanguage();
  const [isDark, setIsDark] = useState(false);
  const [highContrast, setHighContrast] = useState(false);

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
    toast.success(!isDark ? t.darkModeEnabled : t.lightModeEnabled);
  };

  const toggleHighContrast = () => {
    setHighContrast(!highContrast);
    document.documentElement.classList.toggle('high-contrast');
    toast.success(!highContrast ? t.highContrastEnabled : t.highContrastDisabled);
  };

  const readPageContent = () => {
    const text = `${t.title}. ${t.subtitle}`;
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
    toast.success(t.readingPage);
  };

  const showHelp = () => {
    toast.info(t.helpMessage);
  };

  return (
    <TooltipProvider>
      <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={toggleTheme}
              className="rounded-full neumorphic-card w-12 h-12"
            >
              {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{t.toggleTheme}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={readPageContent}
              className="rounded-full neumorphic-card w-12 h-12"
            >
              <Volume2 className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{t.readPageContent}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={toggleHighContrast}
              className={`rounded-full neumorphic-card w-12 h-12 ${
                highContrast ? 'bg-primary text-primary-foreground' : ''
              }`}
            >
              <Contrast className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{t.highContrastMode}</p>
          </TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              size="icon"
              variant="outline"
              onClick={showHelp}
              className="rounded-full neumorphic-card w-12 h-12"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="left">
            <p>{t.helpAccessibility}</p>
          </TooltipContent>
        </Tooltip>
      </div>
    </TooltipProvider>
  );
};

export default AccessibilityControls;
