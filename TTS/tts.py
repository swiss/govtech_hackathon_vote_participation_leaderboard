#!/usr/bin/env python3
import os
import json
import urllib.request
import urllib.error

def load_env(env_path):
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    os.environ[key.strip()] = val.strip()

def main():
    base_dir = os.path.dirname(os.path.abspath(__file__))
    
    # Environment laden (.env im selben Ordner)
    load_env(os.path.join(base_dir, ".env"))
    
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print("Fehler: OPENROUTER_API_KEY nicht in TTS/.env gefunden.")
        return

    input_path = os.path.join(base_dir, "input.txt")
    if not os.path.exists(input_path):
        # Erstelle eine Beispiel-Datei, falls sie nicht existiert
        with open(input_path, "w", encoding="utf-8") as f:
            f.write("Guten Tag! Dies ist ein Test der Google Gemini 3.1 Flash Text-to-Speech Preview über OpenRouter.")
        print(f"Hinweis: Eine Beispiel-Datei wurde unter {input_path} erstellt.")

    with open(input_path, "r", encoding="utf-8") as f:
        text_content = f.read().strip()

    if not text_content:
        print("Fehler: input.txt ist leer.")
        return

    print("Sende Anfrage an OpenRouter (Modell: google/gemini-3.1-flash-tts-preview)...")
    url = "https://openrouter.ai/api/v1/audio/speech"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    # Payload für OpenRouter TTS
    payload = {
        "model": "google/gemini-3.1-flash-tts-preview",
        "input": text_content,
        "voice": "Puck",
        "response_format": "pcm"
    }

    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers=headers,
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as response:
            audio_bytes = response.read()
            
            # Save raw PCM
            pcm_path = os.path.join(base_dir, "output.pcm")
            with open(pcm_path, "wb") as out_f:
                out_f.write(audio_bytes)
            print(f"Erfolg! Die rohe PCM-Audiodatei wurde unter {pcm_path} gespeichert.")
            
            # Save as WAV (24kHz, 16-bit, Mono)
            import wave
            wav_path = os.path.join(base_dir, "output.wav")
            with wave.open(wav_path, "wb") as wav_f:
                wav_f.setnchannels(1)     # Mono
                wav_f.setsampwidth(2)      # 16-bit (2 Bytes)
                wav_f.setframerate(24000)  # 24 kHz
                wav_f.writeframes(audio_bytes)
            print(f"Erfolg! Die spielbare WAV-Audiodatei wurde unter {wav_path} gespeichert.")
            
    except urllib.error.HTTPError as e:
        print(f"HTTP Fehler: {e.code} - {e.reason}")
        try:
            error_body = e.read().decode("utf-8")
            print(f"API Antwort: {error_body}")
        except Exception:
            pass
    except urllib.error.URLError as e:
        print(f"Verbindungsfehler: {e.reason}")
    except Exception as e:
        print(f"Unerwarteter Fehler: {str(e)}")

if __name__ == "__main__":
    main()
