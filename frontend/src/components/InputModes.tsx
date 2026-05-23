import { useState } from "react";
import { Mic, Upload, Link, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { useLanguage } from "@/contexts/LanguageContext";

interface InputModesProps {
  activeMode: 'voice' | 'upload' | 'youtube' | null;
  onProcess: (result: { text: string; braille: string }) => void;
}

const InputModes = ({ activeMode, onProcess }: InputModesProps) => {
  const { t } = useLanguage();
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [youtubeUrl, setYoutubeUrl] = useState("");


  const handleVoiceRecord = () => {
    if (!isRecording) {
      setIsRecording(true);
      toast.success(t.recordingStarted);
      
      // Start recording (this part still needs actual media recorder implementation, keeping simulation for recording part only for now, but connecting to API effectively requires a Blob)
      // Since the prompt asked for "backend routes and connect it properly", and the frontend code existing was strictly simulation, 
      // I will assume for "making audio recording work" we need a real MediaRecorder. 
      // However, sticking to the plan of converting logic first.
      
      // Notes: The previous code was pure simulation `setTimeout`. 
      // To properly record audio in browser, we need MediaRecorder API.
      
      navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
           const mediaRecorder = new MediaRecorder(stream);
           const audioChunks: BlobPart[] = [];

           mediaRecorder.addEventListener("dataavailable", event => {
             audioChunks.push(event.data);
           });

           mediaRecorder.addEventListener("stop", () => {
             const audioBlob = new Blob(audioChunks, { type: 'audio/wav' }); // or mp3
             setIsRecording(false);
             handleRealProcessing(audioBlob);
             stream.getTracks().forEach(track => track.stop());
           });

           mediaRecorder.start();
           
           // Stop recording after 5 seconds automatically for demo or wait for user stop?
           // The UI button is just a toggle, but the current UI logic in `handleVoiceRecord` was just a trigger.
           // The UI shows "Click to Record" then immediately starts a 3s timer.
           // I will keep the 3s timer but actually record.
           
           setTimeout(() => {
             mediaRecorder.stop();
           }, 5000); 
           
        })
        .catch(err => {
            console.error("Error accessing microphone:", err);
            toast.error("Could not access microphone");
            setIsRecording(false);
        });
    }
  };

  const handleRealProcessing = async (blob: Blob) => {
      setIsProcessing(true);
      try {
          const result = await processAudio(blob);
          onProcess(result);
          toast.success(t.translationCompleteToast);
      } catch (error) {
          console.error("Processing error:", error);
          toast.error(t.error || "Failed to process audio");
      } finally {
          setIsProcessing(false);
      }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      toast.success(`${t.fileUploaded}: "${file.name}"`);
      handleRealProcessing(file);
    }
  };

  const handleYoutubeSubmit = () => {
    if (!youtubeUrl) {
      toast.error(t.enterYoutubeUrl);
      return;
    }
    toast.info("YouTube extraction requires backend support not yet implemented in this demo.");
    // simulateProcessing(); 
    // Commented out as we don't have youtube backend route in the plan
  };

  // simulateProcessing removed in favor of handleRealProcessing

  if (!activeMode) return null;

  return (
    <section className="max-w-6xl mx-auto px-4 py-8">
      <div className="grid grid-cols-1 gap-6">
        {activeMode === 'voice' && (
          <Card className="neumorphic-card border-0 animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Mic className="mr-2 h-6 w-6 text-primary" />
                {t.liveVoiceTitle}
              </CardTitle>
              <CardDescription className="text-base">
                {t.liveVoiceDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col items-center gap-6">
              <Button
                size="lg"
                onClick={handleVoiceRecord}
                disabled={isRecording || isProcessing}
                className={`rounded-full w-24 h-24 ${
                  isRecording ? 'pulse-ring bg-destructive hover:bg-destructive/90' : 'bg-primary'
                }`}
              >
                <Mic className="h-10 w-10" />
              </Button>
              <p className="text-muted-foreground">
                {isRecording ? t.recording : t.clickToRecord}
              </p>
            </CardContent>
          </Card>
        )}

        {activeMode === 'upload' && (
          <Card className="neumorphic-card border-0 animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Upload className="mr-2 h-6 w-6 text-primary" />
                {t.uploadVideoTitle}
              </CardTitle>
              <CardDescription className="text-base">
                {t.uploadVideoDescription}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed border-primary/30 rounded-2xl hover:border-primary/60 transition-colors">
                <Upload className="h-12 w-12 text-primary/50" />
                <Input
                  type="file"
                  accept="video/*"
                  onChange={handleFileUpload}
                  disabled={isProcessing}
                  className="max-w-sm"
                />
                <p className="text-sm text-muted-foreground">
                  {t.supportedFormats}
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {activeMode === 'youtube' && (
          <Card className="neumorphic-card border-0 animate-slide-up">
            <CardHeader>
              <CardTitle className="flex items-center text-2xl">
                <Link className="mr-2 h-6 w-6 text-primary" />
                {t.youtubeUrlTitle}
              </CardTitle>
              <CardDescription className="text-base">
                {t.youtubeUrlDescription}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <Input
                placeholder={t.youtubeUrlPlaceholder}
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                disabled={isProcessing}
                className="text-lg py-6 rounded-xl"
              />
              <Button
                onClick={handleYoutubeSubmit}
                disabled={isProcessing || !youtubeUrl}
                className="bg-primary hover:bg-primary-dark rounded-xl"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    {t.processing}
                  </>
                ) : (
                  t.extractAndTranslate
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {isProcessing && (
          <Card className="neumorphic-card border-0 animate-slide-up">
            <CardContent className="flex flex-col items-center gap-4 py-8">
              <Loader2 className="h-12 w-12 animate-spin text-primary" />
              <div className="text-center">
                <p className="text-lg font-semibold mb-2">{t.processing}</p>
                <p className="text-muted-foreground">{t.processingDescription}</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </section>
  );
};

export default InputModes;
