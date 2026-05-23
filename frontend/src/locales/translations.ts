export type Language = 'en' | 'hi' | 'mr';

export const translations = {
  en: {
    // Hero Section
    title: "Sparsh Vaani",
    subtitle: "Bridging sound and touch — Convert speech to Braille effortlessly",
    liveVoiceInput: "Live Voice Input",
    uploadVideo: "Upload Video",
    youtubeUrl: "YouTube URL",
    
    // Input Modes
    liveVoiceTitle: "Live Voice Input",
    liveVoiceDescription: "Click the button below to start recording your voice",
    clickToRecord: "Click to record",
    recording: "Recording...",
    
    uploadVideoTitle: "Upload Video File",
    uploadVideoDescription: "Upload a video file (MP4, MOV, AVI) to extract and translate audio",
    supportedFormats: "Supported formats: MP4, MOV, AVI, MKV",
    
    youtubeUrlTitle: "YouTube URL",
    youtubeUrlDescription: "Paste a YouTube video URL to automatically extract and translate its audio",
    youtubeUrlPlaceholder: "https://www.youtube.com/watch?v=...",
    extractAndTranslate: "Extract & Translate",
    
    processing: "Processing...",
    processingDescription: "Extracting audio and translating to Braille",
    
    // Output Display
    translationComplete: "Translation Complete",
    translationCompleteDescription: "Your audio has been successfully transcribed and converted to Braille",
    textTranscription: "Text Transcription",
    readAloud: "Read Aloud",
    brailleTranslation: "Braille Translation",
    copy: "Copy",
    copied: "Copied",
    download: "Download",
    
    // Accessibility Controls
    toggleTheme: "Toggle theme",
    readPageContent: "Read page content",
    helpAccessibility: "Help & accessibility",
    highContrastMode: "High contrast mode",
    
    // Footer
    tagline: "Empowering communication through touch and technology",
    madeBy: "Made by Team Sparsh Vaani",
    allRightsReserved: "All rights reserved.",
    
    // Toasts
    recordingStarted: "Recording started",
    fileUploaded: "File uploaded",
    fetchingYoutube: "Fetching audio from YouTube...",
    translationCompleteToast: "Translation complete!",
    brailleCopied: "Braille text copied to clipboard",
    downloadSuccess: "Downloaded successfully",
    readingAloud: "Reading text aloud",
    darkModeEnabled: "Dark mode enabled",
    lightModeEnabled: "Light mode enabled",
    highContrastEnabled: "High contrast enabled",
    highContrastDisabled: "High contrast disabled",
    readingPage: "Reading page content",
    helpMessage: "Help: Use the buttons above to select your input method. The app will transcribe and convert to Braille automatically.",
    enterYoutubeUrl: "Please enter a YouTube URL",
  },
  hi: {
    // Hero Section
    title: "स्पर्श वाणी",
    subtitle: "ध्वनि और स्पर्श को जोड़ना — भाषण को ब्रेल में आसानी से बदलें",
    liveVoiceInput: "लाइव आवाज इनपुट",
    uploadVideo: "वीडियो अपलोड करें",
    youtubeUrl: "YouTube URL",
    
    // Input Modes
    liveVoiceTitle: "लाइव आवाज इनपुट",
    liveVoiceDescription: "अपनी आवाज रिकॉर्ड करना शुरू करने के लिए नीचे दिए गए बटन पर क्लिक करें",
    clickToRecord: "रिकॉर्ड करने के लिए क्लिक करें",
    recording: "रिकॉर्डिंग...",
    
    uploadVideoTitle: "वीडियो फ़ाइल अपलोड करें",
    uploadVideoDescription: "ऑडियो निकालने और अनुवाद करने के लिए एक वीडियो फ़ाइल अपलोड करें (MP4, MOV, AVI)",
    supportedFormats: "समर्थित प्रारूप: MP4, MOV, AVI, MKV",
    
    youtubeUrlTitle: "YouTube URL",
    youtubeUrlDescription: "स्वचालित रूप से इसके ऑडियो को निकालने और अनुवाद करने के लिए एक YouTube वीडियो URL पेस्ट करें",
    youtubeUrlPlaceholder: "https://www.youtube.com/watch?v=...",
    extractAndTranslate: "निकालें और अनुवाद करें",
    
    processing: "प्रसंस्करण...",
    processingDescription: "ऑडियो निकालना और ब्रेल में अनुवाद करना",
    
    // Output Display
    translationComplete: "अनुवाद पूर्ण",
    translationCompleteDescription: "आपके ऑडियो को सफलतापूर्वक ट्रांसक्राइब और ब्रेल में परिवर्तित किया गया है",
    textTranscription: "पाठ प्रतिलेखन",
    readAloud: "जोर से पढ़ें",
    brailleTranslation: "ब्रेल अनुवाद",
    copy: "कॉपी करें",
    copied: "कॉपी किया गया",
    download: "डाउनलोड करें",
    
    // Accessibility Controls
    toggleTheme: "थीम टॉगल करें",
    readPageContent: "पेज सामग्री पढ़ें",
    helpAccessibility: "सहायता और पहुँच",
    highContrastMode: "उच्च कंट्रास्ट मोड",
    
    // Footer
    tagline: "स्पर्श और प्रौद्योगिकी के माध्यम से संचार को सशक्त बनाना",
    madeBy: "टीम स्पर्श वाणी द्वारा निर्मित",
    allRightsReserved: "सर्वाधिकार सुरक्षित।",
    
    // Toasts
    recordingStarted: "रिकॉर्डिंग शुरू हुई",
    fileUploaded: "फ़ाइल अपलोड की गई",
    fetchingYoutube: "YouTube से ऑडियो प्राप्त किया जा रहा है...",
    translationCompleteToast: "अनुवाद पूर्ण!",
    brailleCopied: "ब्रेल पाठ क्लिपबोर्ड पर कॉपी किया गया",
    downloadSuccess: "सफलतापूर्वक डाउनलोड किया गया",
    readingAloud: "जोर से पाठ पढ़ना",
    darkModeEnabled: "डार्क मोड सक्षम",
    lightModeEnabled: "लाइट मोड सक्षम",
    highContrastEnabled: "उच्च कंट्रास्ट सक्षम",
    highContrastDisabled: "उच्च कंट्रास्ट अक्षम",
    readingPage: "पेज सामग्री पढ़ना",
    helpMessage: "सहायता: अपनी इनपुट विधि चुनने के लिए ऊपर दिए गए बटनों का उपयोग करें। ऐप स्वचालित रूप से ट्रांसक्राइब और ब्रेल में परिवर्तित करेगा।",
    enterYoutubeUrl: "कृपया एक YouTube URL दर्ज करें",
  },
  mr: {
    // Hero Section
    title: "स्पर्श वाणी",
    subtitle: "ध्वनी आणि स्पर्श यांना जोडणे — भाषण सहजपणे ब्रेलमध्ये रूपांतरित करा",
    liveVoiceInput: "थेट आवाज इनपुट",
    uploadVideo: "व्हिडिओ अपलोड करा",
    youtubeUrl: "YouTube URL",
    
    // Input Modes
    liveVoiceTitle: "थेट आवाज इनपुट",
    liveVoiceDescription: "तुमचा आवाज रेकॉर्ड करण्यास प्रारंभ करण्यासाठी खालील बटणावर क्लिक करा",
    clickToRecord: "रेकॉर्ड करण्यासाठी क्लिक करा",
    recording: "रेकॉर्डिंग...",
    
    uploadVideoTitle: "व्हिडिओ फाइल अपलोड करा",
    uploadVideoDescription: "ऑडिओ काढण्यासाठी आणि अनुवाद करण्यासाठी व्हिडिओ फाइल अपलोड करा (MP4, MOV, AVI)",
    supportedFormats: "समर्थित स्वरूपे: MP4, MOV, AVI, MKV",
    
    youtubeUrlTitle: "YouTube URL",
    youtubeUrlDescription: "स्वयंचलितपणे त्याचा ऑडिओ काढण्यासाठी आणि अनुवाद करण्यासाठी YouTube व्हिडिओ URL पेस्ट करा",
    youtubeUrlPlaceholder: "https://www.youtube.com/watch?v=...",
    extractAndTranslate: "काढा आणि अनुवाद करा",
    
    processing: "प्रक्रिया करत आहे...",
    processingDescription: "ऑडिओ काढणे आणि ब्रेलमध्ये अनुवाद करणे",
    
    // Output Display
    translationComplete: "अनुवाद पूर्ण",
    translationCompleteDescription: "तुमचा ऑडिओ यशस्वीरित्या ट्रान्सक्रिप्ट केला गेला आहे आणि ब्रेलमध्ये रूपांतरित केला गेला आहे",
    textTranscription: "मजकूर प्रतिलेखन",
    readAloud: "मोठ्याने वाचा",
    brailleTranslation: "ब्रेल भाषांतर",
    copy: "कॉपी करा",
    copied: "कॉपी केले",
    download: "डाउनलोड करा",
    
    // Accessibility Controls
    toggleTheme: "थीम टॉगल करा",
    readPageContent: "पृष्ठ सामग्री वाचा",
    helpAccessibility: "मदत आणि प्रवेशयोग्यता",
    highContrastMode: "उच्च कॉन्ट्रास्ट मोड",
    
    // Footer
    tagline: "स्पर्श आणि तंत्रज्ञानाद्वारे संप्रेषण सक्षम करणे",
    madeBy: "टीम स्पर्श वाणी द्वारे तयार केले",
    allRightsReserved: "सर्व हक्क राखीव.",
    
    // Toasts
    recordingStarted: "रेकॉर्डिंग सुरू झाले",
    fileUploaded: "फाइल अपलोड केली",
    fetchingYoutube: "YouTube वरून ऑडिओ मिळवत आहे...",
    translationCompleteToast: "भाषांतर पूर्ण!",
    brailleCopied: "ब्रेल मजकूर क्लिपबोर्डवर कॉपी केले",
    downloadSuccess: "यशस्वीरित्या डाउनलोड केले",
    readingAloud: "मोठ्याने मजकूर वाचत आहे",
    darkModeEnabled: "गडद मोड सक्षम",
    lightModeEnabled: "प्रकाश मोड सक्षम",
    highContrastEnabled: "उच्च कॉन्ट्रास्ट सक्षम",
    highContrastDisabled: "उच्च कॉन्ट्रास्ट अक्षम",
    readingPage: "पृष्ठ सामग्री वाचत आहे",
    helpMessage: "मदत: तुमची इनपुट पद्धत निवडण्यासाठी वरील बटणे वापरा. अॅप स्वयंचलितपणे ट्रान्सक्रिप्ट करेल आणि ब्रेलमध्ये रूपांतरित करेल।",
    enterYoutubeUrl: "कृपया YouTube URL प्रविष्ट करा",
  },
};

export const languageNames: Record<Language, string> = {
  en: "English",
  hi: "हिंदी",
  mr: "मराठी",
};
