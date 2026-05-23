import { Mic, Upload, Link, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";

interface HeroProps {
  onModeSelect: (mode: 'voice' | 'upload' | 'youtube' | 'assistant') => void;
}

const Hero = ({ onModeSelect }: HeroProps) => {
  const { t } = useLanguage();
  
  return (
    <section className="relative min-h-[60vh] flex flex-col items-center justify-center px-4 py-16 overflow-hidden">
      {/* Animated wave background */}
      <div className="wave-animation">
        <div className="wave"></div>
        <div className="wave"></div>
        <div className="wave"></div>
      </div>

      {/* Content */}
      <div className="relative z-10 text-center max-w-4xl mx-auto animate-slide-up">
        <h1 className="text-5xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
          {t.title}
        </h1>
        <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
          {t.subtitle}
        </p>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
          <Button
            size="lg"
            onClick={() => onModeSelect('voice')}
            className="group relative overflow-hidden bg-gradient-to-r from-primary to-accent hover:shadow-lg transition-all duration-300 rounded-2xl px-8 py-6 text-lg"
          >
            <Mic className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform" />
            {t.liveVoiceInput}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => onModeSelect('upload')}
            className="neumorphic-card border-2 rounded-2xl px-8 py-6 text-lg"
          >
            <Upload className="mr-2 h-5 w-5" />
            {t.uploadVideo}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => onModeSelect('youtube')}
            className="neumorphic-card border-2 rounded-2xl px-8 py-6 text-lg"
          >
            <Link className="mr-2 h-5 w-5" />
            {t.youtubeUrl}
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => onModeSelect('assistant')}
            className="neumorphic-card border-2 rounded-2xl px-8 py-6 text-lg"
          >
            <MessageCircle className="mr-2 h-5 w-5" />
            Voice Assistant
          </Button>
        </div>
      </div>
    </section>
  );
};

export default Hero;
