import { useState } from "react";
import { Copy, Download, Volume2, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface OutputDisplayProps {
  result: { text: string; braille: string } | null;
}

const OutputDisplay = ({ result }: OutputDisplayProps) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);

  if (!result) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(result.braille);
    setCopied(true);
    toast.success(t.brailleCopied);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const content = `${t.textTranscription}: ${result.text}\n\n${t.brailleTranslation}: ${result.braille}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'braille-translation.txt';
    a.click();
    URL.revokeObjectURL(url);
    toast.success(t.downloadSuccess);
  };

  const handleSpeak = () => {
    const utterance = new SpeechSynthesisUtterance(result.text);
    utterance.rate = 0.9;
    speechSynthesis.speak(utterance);
    toast.success(t.readingAloud);
  };

  return (
    <section className="max-w-6xl mx-auto px-4 py-8 animate-slide-up">
      <Card className="neumorphic-card border-0">
        <CardHeader>
          <CardTitle className="text-2xl">{t.translationComplete}</CardTitle>
          <CardDescription className="text-base">
            {t.translationCompleteDescription}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Text transcription */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{t.textTranscription}</h3>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSpeak}
                className="rounded-lg"
              >
                <Volume2 className="h-4 w-4 mr-2" />
                {t.readAloud}
              </Button>
            </div>
            <div className="p-4 bg-secondary/50 rounded-xl">
              <p className="text-foreground leading-relaxed">{result.text}</p>
            </div>
          </div>

          <Separator />

          {/* Braille output */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">{t.brailleTranslation}</h3>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="rounded-lg"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      {t.copied}
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 mr-2" />
                      {t.copy}
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="rounded-lg"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t.download}
                </Button>
              </div>
            </div>
            <div className="p-6 bg-primary-light/30 rounded-xl">
              <p className="braille-text text-primary-dark select-all">
                {result.braille}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default OutputDisplay;
