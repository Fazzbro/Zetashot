import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const script = `
Add-Type -AssemblyName System.Speech
$speak = New-Object System.Speech.Synthesis.SpeechSynthesizer
$speak.GetInstalledVoices() | ForEach-Object { Write-Output $_.VoiceInfo.Name }
$speak.Dispose()
`;

const ps1Path = path.resolve('temp_tts_voices.ps1');
fs.writeFileSync(ps1Path, script, 'utf8');
const out = execSync(`powershell -ExecutionPolicy Bypass -File "${ps1Path}"`, { encoding: 'utf8' });
if (fs.existsSync(ps1Path)) fs.unlinkSync(ps1Path);
console.log('Voices available:\n' + out);
