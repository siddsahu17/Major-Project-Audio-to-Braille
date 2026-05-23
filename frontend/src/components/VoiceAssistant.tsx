import { useState, useRef, useEffect } from "react";
import { Mic, Loader2, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { sendVoiceChat } from "@/lib/api";

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  audioUrl?: string;
}

const VoiceAssistant = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [sessionId] = useState(() => Math.random().toString(36).substring(7));
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleStartRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.addEventListener("dataavailable", (event) => {
        audioChunksRef.current.push(event.data);
      });

      mediaRecorder.addEventListener("stop", async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        stream.getTracks().forEach(track => track.stop());
        await processVoiceChat(audioBlob);
      });

      mediaRecorder.start();
      setIsRecording(true);
      toast.success("Recording started... Click again to stop.");
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error("Could not access microphone");
    }
  };

  const handleStopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  const processVoiceChat = async (blob: Blob) => {
    setIsProcessing(true);
    setMessages(prev => [...prev, { role: 'user', content: '🎤 (Audio Sent)' }]);

    try {
      const result = await sendVoiceChat(sessionId, blob);
      
      // Update user message with what they actually said
      setMessages(prev => {
        const newMessages = [...prev];
        newMessages[newMessages.length - 1].content = result.transcription || "🎤 (Unintelligible)";
        return newMessages;
      });

      // Format audio URL if relative
      let audioUrl = result.audio_url;
      if (audioUrl && !audioUrl.startsWith('http')) {
         const cleanUrl = audioUrl.startsWith('/') ? audioUrl.substring(1) : audioUrl;
         audioUrl = `http://localhost:8000/${cleanUrl}`;
      }

      const assistantMsg: Message = {
        role: 'assistant',
        content: result.response || "No response provided.",
        audioUrl: audioUrl
      };

      setMessages(prev => [...prev, assistantMsg]);

      if (audioUrl) {
         if (audioPlayerRef.current) {
             audioPlayerRef.current.src = audioUrl;
             audioPlayerRef.current.play().catch(e => console.log('Audio play error:', e));
         }
      }

    } catch (error) {
      console.error("Chat error:", error);
      toast.error("Failed to communicate with assistant. Ensure backend is running locally.");
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Error connecting to server." }]);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <section className="max-w-4xl mx-auto px-4 py-8 flex justify-center">
      <Card className="neumorphic-card border-0 animate-slide-up flex flex-col h-[600px] w-full max-w-2xl">
        <CardHeader>
          <CardTitle className="flex items-center text-2xl">
            <Volume2 className="mr-2 h-6 w-6 text-primary" />
            Voice Assistant Chatbot
          </CardTitle>
          <CardDescription>
            Hold a continuous conversation with your AI tutor.
          </CardDescription>
        </CardHeader>
        
        <CardContent className="flex-1 overflow-y-auto flex flex-col gap-4 p-6 bg-slate-50 border rounded-lg mx-6 mb-4 mt-2">
          {messages.length === 0 && (
            <div className="flex-1 flex items-center justify-center text-muted-foreground text-center">
              <div>
                <Volume2 className="h-10 w-10 mx-auto mb-2 opacity-50" />
                <p>No messages yet.<br/>Tap the microphone button to start talking!</p>
              </div>
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`p-4 rounded-2xl max-w-[80%] ${m.role === 'user' ? 'bg-primary text-primary-foreground rounded-tr-sm' : 'bg-white shadow-sm border rounded-tl-sm text-foreground'}`}>
                <p className="text-sm md:text-base">{m.content}</p>
                {m.audioUrl && (
                  <audio controls src={m.audioUrl} className="mt-2 h-8 outline-none max-w-[200px]" />
                )}
              </div>
            </div>
          ))}
          {isProcessing && (
             <div className="flex justify-start">
               <div className="p-4 bg-white shadow-sm border rounded-2xl rounded-tl-sm flex items-center gap-2 text-muted-foreground text-sm">
                 <Loader2 className="h-4 w-4 animate-spin" />
                 AI is thinking...
               </div>
             </div>
          )}
          <div ref={messagesEndRef} />
        </CardContent>

        <div className="p-6 pt-0 flex justify-center mt-2">
          <Button
            size="lg"
            onClick={isRecording ? handleStopRecording : handleStartRecording}
            disabled={isProcessing}
            className={`rounded-full w-20 h-20 shadow-lg transition-all duration-300 ${
              isRecording ? 'pulse-ring bg-destructive hover:bg-destructive/90 scale-110' : 'bg-primary hover:bg-primary/90'
            }`}
          >
            {isRecording ? <div className="h-6 w-6 bg-white rounded-sm" /> : <Mic className="h-8 w-8" />}
          </Button>
        </div>
      </Card>
      
      {/* Hidden audio player for autoplay */}
      <audio ref={audioPlayerRef} className="hidden" />
    </section>
  );
};

export default VoiceAssistant;
