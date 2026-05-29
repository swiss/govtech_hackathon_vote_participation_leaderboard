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

    sys_prompt_path = os.path.join(base_dir, "tts_script_kantonsrennen_systemprompt.txt")
    ssml_path_v2 = os.path.join(base_dir, "tts_script_kantonsrennen_ssml_v2.xml")
    if os.path.exists(ssml_path_v2):
        ssml_path = ssml_path_v2
    else:
        ssml_path = os.path.join(base_dir, "tts_script_kantonsrennen_ssml.xml")
    
    chunks = []
    
    if os.path.exists(sys_prompt_path) and os.path.exists(ssml_path):
        print(f"Lade System-Prompt aus {os.path.basename(sys_prompt_path)} und SSML aus {os.path.basename(ssml_path)}...")
        with open(sys_prompt_path, "r", encoding="utf-8") as f:
            sys_prompt = f.read().strip()
        with open(ssml_path, "r", encoding="utf-8") as f:
            ssml_lines = f.readlines()
            
        # Parse SSML Zeilen (lassen <speak> und </speak> weg, um sie selbst je Chunk zu umhüllen)
        lines_to_process = []
        for line in ssml_lines:
            line_str = line.strip()
            if not line_str or line_str == "<speak>" or line_str == "</speak>":
                continue
            lines_to_process.append(line)
            
        # Generiere Chunks unter dem 4000 Byte-Limit (sicherheitsorientiert auf 3500 Byte gesetzt)
        MAX_INPUT_BYTES = 3500
        
        def build_full_prompt(lines):
            ssml_chunk = "<speak>\n" + "".join(lines) + "</speak>"
            return f"System Instructions:\n{sys_prompt}\n\n#### TRANSCRIPT\n{ssml_chunk}"
            
        current_chunk_lines = []
        for line in lines_to_process:
            test_lines = current_chunk_lines + [line]
            test_prompt = build_full_prompt(test_lines)
            if len(test_prompt.encode("utf-8")) > MAX_INPUT_BYTES:
                if current_chunk_lines:
                    chunks.append(build_full_prompt(current_chunk_lines))
                    current_chunk_lines = [line]
                else:
                    # Falls eine einzelne Zeile das Limit sprengt
                    chunks.append(test_prompt)
                    current_chunk_lines = []
            else:
                current_chunk_lines.append(line)
                
        if current_chunk_lines:
            chunks.append(build_full_prompt(current_chunk_lines))
            
        print(f"SSML in {len(chunks)} Chunks aufgeteilt (Limit: {MAX_INPUT_BYTES} Bytes pro Chunk).")
    else:
        input_path = os.path.join(base_dir, "input.txt")
        if not os.path.exists(input_path):
            with open(input_path, "w", encoding="utf-8") as f:
                f.write("Guten Tag! Dies ist ein Test der Google Gemini 3.1 Flash Text-to-Speech Preview über OpenRouter.")
            print(f"Hinweis: Eine Beispiel-Datei wurde unter {input_path} erstellt.")

        with open(input_path, "r", encoding="utf-8") as f:
            text_content = f.read().strip()

        if not text_content:
            print("Fehler: input.txt ist leer.")
            return
            
        chunks.append(text_content)

    print("Verbinde mit OpenRouter...")
    url = "https://openrouter.ai/api/v1/audio/speech"
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json"
    }
    
    audio_chunks = []
    
    for idx, chunk_text in enumerate(chunks, 1):
        print(f"Sende Anfrage für Chunk {idx}/{len(chunks)} an OpenRouter (Modell: google/gemini-3.1-flash-tts-preview)...")
        
        payload = {
            "model": "google/gemini-3.1-flash-tts-preview",
            "input": chunk_text,
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
                audio_chunks.append(response.read())
        except urllib.error.HTTPError as e:
            print(f"HTTP Fehler bei Chunk {idx}: {e.code} - {e.reason}")
            try:
                error_body = e.read().decode("utf-8")
                print(f"API Antwort: {error_body}")
            except Exception:
                pass
            return
        except urllib.error.URLError as e:
            print(f"Verbindungsfehler bei Chunk {idx}: {e.reason}")
            return
        except Exception as e:
            print(f"Unerwarteter Fehler bei Chunk {idx}: {str(e)}")
            return

    # Kombiniere alle Audio-Chuncks
    audio_bytes = b"".join(audio_chunks)
    
    try:
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
            
    except Exception as e:
        print(f"Fehler beim Speichern der Audio-Ausgabe: {str(e)}")

if __name__ == "__main__":
    main()
