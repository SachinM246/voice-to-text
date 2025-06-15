"use client";

import { useState, useRef, useEffect } from "react";
import {
  Button,
  Typography,
  Box,
  Card,
  CardContent,
  Stack,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  IconButton,
  Divider,
  Chip,
  LinearProgress,
  Fade,
  Tooltip,
  Paper,
} from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import StopIcon from "@mui/icons-material/Stop";
import PauseIcon from "@mui/icons-material/Pause";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import AudiotrackIcon from "@mui/icons-material/Audiotrack";
import TranslateIcon from "@mui/icons-material/Translate";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import ClearIcon from "@mui/icons-material/Clear";
import DownloadIcon from "@mui/icons-material/Download";
import RecordVoiceOverIcon from "@mui/icons-material/RecordVoiceOver";

export default function HomePage() {
  const [transcript, setTranscript] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [language, setLanguage] = useState("");
  const [instructionText, setInstructionText] = useState("");
  const [copySuccess, setCopySuccess] = useState(false);
  const [audioURL, setAudioURL] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isConnecting, setIsConnecting] = useState(false);

  const audioRef = useRef(null);
  const wsRef = useRef(null);
  const recorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const DEEPGRAM_API_KEY = process.env.NEXT_PUBLIC_DEEPGRAM_API_KEY;

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime((prev) => prev + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setRecordingTime(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStartRecording = async () => {
    if (!language) {
      setInstructionText("Please select a language first!");
      return;
    }
    
    setTranscript("");
    setIsRecording(true);
    setIsPaused(false);
    setIsConnecting(true);
    setInstructionText("Connecting to speech service...");
    audioChunksRef.current = [];

    const queryParam =
      language === "hinglish" ? "languages=hi,en" : `language=${language}`;

    const deepgramSocket = new WebSocket(
      `wss://api.deepgram.com/v1/listen?punctuate=true&${queryParam}`,
      ["token", DEEPGRAM_API_KEY]
    );

    wsRef.current = deepgramSocket;

    deepgramSocket.onopen = async () => {
      console.log("WebSocket connection established");
      setIsConnecting(false);

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream);
      recorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (deepgramSocket.readyState === WebSocket.OPEN) {
          deepgramSocket.send(event.data);
        }
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.start(250);
      startTimer();

      setTimeout(() => {
        setInstructionText("🎤 Listening... Start speaking now!");
      }, 1000);
    };

    deepgramSocket.onmessage = (message) => {
      const data = JSON.parse(message.data);
      const newTranscript = data.channel.alternatives[0].transcript;
      if (newTranscript.trim()) {
        setTranscript((prev) => prev + " " + newTranscript);
      }
    };

    deepgramSocket.onerror = (error) => {
      console.error("WebSocket error:", error);
      setInstructionText("Connection error. Please try again.");
      handleStopRecording();
    };
  };

  const handlePauseRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.pause();
      setIsPaused(true);
      stopTimer();
      setInstructionText("⏸️ Recording paused");
    }
  };

  const handleResumeRecording = () => {
    if (recorderRef.current) {
      recorderRef.current.resume();
      setIsPaused(false);
      startTimer();
      setInstructionText("🎤 Recording resumed... Keep speaking!");
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    setIsPaused(false);
    setIsConnecting(false);
    stopTimer();
    recorderRef.current?.stop();
    audioRef.current?.getTracks().forEach((track) => track.stop());
    wsRef.current?.close();
    setInstructionText("✅ Recording completed!");

    const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
    const url = URL.createObjectURL(audioBlob);
    setAudioURL(url);
  };

  const handleCopyTranscript = async () => {
    try {
      await navigator.clipboard.writeText(transcript);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    } catch (err) {
      const textArea = document.createElement('textarea');
      textArea.value = transcript;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 3000);
    }
  };

  const handleClearTranscript = () => {
    setTranscript("");
    setInstructionText("");
  };

  const handleDownloadTranscript = () => {
    const element = document.createElement("a");
    const file = new Blob([transcript], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `transcript_${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      wsRef.current?.close();
      audioRef.current?.getTracks().forEach((track) => track.stop());
      stopTimer();
    };
  }, []);

  const languages = [
    { code: "hi", name: "Hindi", flag: "🇮🇳" },
    { code: "en", name: "English", flag: "🇺🇸" },
    { code: "hinglish", name: "Hinglish", flag: "🇮🇳" },
    { code: "es", name: "Spanish", flag: "🇪🇸" },
    { code: "fr", name: "French", flag: "🇫🇷" },
    { code: "de", name: "German", flag: "🇩🇪" },
    { code: "it", name: "Italian", flag: "🇮🇹" },
    { code: "pt", name: "Portuguese", flag: "🇵🇹" },
    { code: "ja", name: "Japanese", flag: "🇯🇵" },
    { code: "ko", name: "Korean", flag: "🇰🇷" },
    { code: "zh", name: "Chinese", flag: "🇨🇳" },
  ];

  const selectedLanguage = languages.find(lang => lang.code === language);

  return (
    <Box
      sx={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        padding: { xs: 2, md: 4 },
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
      }}
    >
      <Paper
        elevation={24}
        sx={{
          width: "100%",
          maxWidth: 900,
          borderRadius: 4,
          overflow: "hidden",
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)",
        }}
      >
        <Box
          sx={{
            background: "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
            padding: 4,
            textAlign: "center",
            color: "white",
          }}
        >
          <RecordVoiceOverIcon sx={{ fontSize: 48, mb: 2 }} />
          <Typography variant="h3" fontWeight="bold" gutterBottom>
            Voice to Text
          </Typography>
          <Typography variant="h6" sx={{ opacity: 0.9 }}>
            Convert your speech to text with AI precision
          </Typography>
        </Box>

        <Box sx={{ padding: 4 }}>
          <Card sx={{ mb: 4, borderRadius: 3, border: "2px solid #e3f2fd" }}>
            <CardContent>
              <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                <TranslateIcon color="primary" />
                <Typography variant="h6" fontWeight="bold">
                  Select Language
                </Typography>
              </Stack>
              
              <FormControl fullWidth>
                <Select
                  value={language}
                  onChange={handleLanguageChange}
                  displayEmpty
                  sx={{
                    borderRadius: 2,
                    "& .MuiOutlinedInput-root": {
                      "&:hover fieldset": {
                        borderColor: "#4facfe",
                      },
                    },
                  }}
                >
                  <MenuItem disabled value="">
                    <em>Choose your preferred language</em>
                  </MenuItem>
                  {languages.map((lang) => (
                    <MenuItem key={lang.code} value={lang.code}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <span>{lang.flag}</span>
                        <span>{lang.name}</span>
                      </Stack>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              {selectedLanguage && (
                <Fade in>
                  <Chip
                    icon={<span>{selectedLanguage.flag}</span>}
                    label={`Selected: ${selectedLanguage.name}`}
                    color="primary"
                    sx={{ mt: 2 }}
                  />
                </Fade>
              )}
            </CardContent>
          </Card>

          <Card sx={{ mb: 4, borderRadius: 3, border: "2px solid #e8f5e8" }}>
            <CardContent sx={{ textAlign: "center" }}>
              <Typography variant="h6" fontWeight="bold" mb={3}>
                Recording Controls
              </Typography>

              <Box sx={{ mb: 3 }}>
                {isRecording && (
                  <Stack alignItems="center" spacing={2}>
                    <Chip
                      icon={<MicIcon />}
                      label={`Recording: ${formatTime(recordingTime)}`}
                      color="error"
                      variant="filled"
                      sx={{ 
                        fontSize: "1.1rem",
                        padding: "8px 16px",
                        animation: isPaused ? "none" : "pulse 2s infinite",
                        "@keyframes pulse": {
                          "0%": { opacity: 1 },
                          "50%": { opacity: 0.7 },
                          "100%": { opacity: 1 },
                        },
                      }}
                    />
                    {isConnecting && <LinearProgress sx={{ width: "100%", mt: 1 }} />}
                  </Stack>
                )}
                
                {instructionText && (
                  <Typography
                    variant="body1"
                    sx={{
                      mt: 2,
                      padding: 2,
                      backgroundColor: "#f0f8ff",
                      borderRadius: 2,
                      border: "1px solid #e3f2fd",
                      fontWeight: 500,
                    }}
                  >
                    {instructionText}
                  </Typography>
                )}
              </Box>

              <Stack direction="row" spacing={2} justifyContent="center">
                {!isRecording && (
                  <Tooltip title="Start Recording">
                    <IconButton
                      onClick={handleStartRecording}
                      size="large"
                      sx={{
                        bgcolor: "#4caf50",
                        color: "white",
                        width: 64,
                        height: 64,
                        "&:hover": { bgcolor: "#45a049", transform: "scale(1.05)" },
                        transition: "all 0.2s",
                      }}
                    >
                      <MicIcon sx={{ fontSize: 32 }} />
                    </IconButton>
                  </Tooltip>
                )}

                {isRecording && !isPaused && (
                  <Tooltip title="Pause Recording">
                    <IconButton
                      onClick={handlePauseRecording}
                      size="large"
                      sx={{
                        bgcolor: "#ff9800",
                        color: "white",
                        width: 64,
                        height: 64,
                        "&:hover": { bgcolor: "#f57c00", transform: "scale(1.05)" },
                        transition: "all 0.2s",
                      }}
                    >
                      <PauseIcon sx={{ fontSize: 32 }} />
                    </IconButton>
                  </Tooltip>
                )}

                {isPaused && (
                  <Tooltip title="Resume Recording">
                    <IconButton
                      onClick={handleResumeRecording}
                      size="large"
                      sx={{
                        bgcolor: "#4caf50",
                        color: "white",
                        width: 64,
                        height: 64,
                        "&:hover": { bgcolor: "#45a049", transform: "scale(1.05)" },
                        transition: "all 0.2s",
                      }}
                    >
                      <PlayArrowIcon sx={{ fontSize: 32 }} />
                    </IconButton>
                  </Tooltip>
                )}

                {isRecording && (
                  <Tooltip title="Stop Recording">
                    <IconButton
                      onClick={handleStopRecording}
                      size="large"
                      sx={{
                        bgcolor: "#f44336",
                        color: "white",
                        width: 64,
                        height: 64,
                        "&:hover": { bgcolor: "#d32f2f", transform: "scale(1.05)" },
                        transition: "all 0.2s",
                      }}
                    >
                      <StopIcon sx={{ fontSize: 32 }} />
                    </IconButton>
                  </Tooltip>
                )}
              </Stack>
            </CardContent>
          </Card>

          <Card
            sx={{
              mb: 3,
              borderRadius: 3,
              border: "2px solid #fff3e0",
              minHeight: 200,
            }}
          >
            <CardContent>
              <Stack
                direction="row"
                justifyContent="space-between"
                alignItems="center"
                mb={2}
              >
                <Typography variant="h6" fontWeight="bold">
                  📝 Transcription
                </Typography>
                
                <Stack direction="row" spacing={1}>
                  {transcript && (
                    <>
                      <Tooltip title={copySuccess ? "Copied!" : "Copy to Clipboard"}>
                        <IconButton
                          onClick={handleCopyTranscript}
                          size="small"
                          sx={{ 
                            color: copySuccess ? "green" : "primary.main",
                            transform: copySuccess ? "scale(1.1)" : "scale(1)",
                            transition: "all 0.2s",
                          }}
                        >
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Download as Text File">
                        <IconButton onClick={handleDownloadTranscript} size="small">
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Clear Text">
                        <IconButton onClick={handleClearTranscript} size="small">
                          <ClearIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </Stack>

              <Box
                sx={{
                  minHeight: 120,
                  padding: 3,
                  backgroundColor: "#fafafa",
                  borderRadius: 2,
                  border: "1px dashed #ddd",
                }}
              >
                <Typography
                  variant="body1"
                  sx={{
                    lineHeight: 1.8,
                    fontSize: "1.1rem",
                    color: transcript ? "#333" : "#999",
                    fontStyle: transcript ? "normal" : "italic",
                  }}
                >
                  {transcript || "Your speech will appear here as you speak..."}
                </Typography>
              </Box>

              {copySuccess && (
                <Fade in>
                  <Box
                    sx={{
                      mt: 2,
                      p: 2,
                      backgroundColor: "#e8f5e8",
                      borderRadius: 2,
                      border: "1px solid #4caf50",
                      textAlign: "center",
                    }}
                  >
                    <Typography
                      variant="body2"
                      sx={{ 
                        color: "#2e7d32", 
                        fontWeight: "bold",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: 1,
                      }}
                    >
                      ✅ Text copied to clipboard successfully!
                    </Typography>
                  </Box>
                </Fade>
              )}
            </CardContent>
          </Card>

          {audioURL && (
            <Fade in>
              <Card sx={{ borderRadius: 3, border: "2px solid #e8f5e8" }}>
                <CardContent>
                  <Stack direction="row" alignItems="center" spacing={2} mb={2}>
                    <VolumeUpIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">
                      Recording Playback
                    </Typography>
                  </Stack>
                  <audio
                    controls
                    src={audioURL}
                    style={{
                      width: "100%",
                      borderRadius: "8px",
                    }}
                  />
                </CardContent>
              </Card>
            </Fade>
          )}
        </Box>
      </Paper>
    </Box>
  );
}