function writeAscii(view: DataView, offset: number, value: string) {
  for (let index = 0; index < value.length; index += 1) {
    view.setUint8(offset + index, value.charCodeAt(index));
  }
}

function resampleToMono(buffer: AudioBuffer, targetRate: number): Float32Array {
  const frameCount = Math.max(1, Math.round(buffer.duration * targetRate));
  const output = new Float32Array(frameCount);
  const sourceRate = buffer.sampleRate;

  for (let outputIndex = 0; outputIndex < frameCount; outputIndex += 1) {
    const sourcePosition = (outputIndex * sourceRate) / targetRate;
    const left = Math.min(buffer.length - 1, Math.floor(sourcePosition));
    const right = Math.min(buffer.length - 1, left + 1);
    const fraction = sourcePosition - left;
    let sample = 0;

    for (let channel = 0; channel < buffer.numberOfChannels; channel += 1) {
      const source = buffer.getChannelData(channel);
      sample += source[left] + (source[right] - source[left]) * fraction;
    }
    output[outputIndex] = sample / buffer.numberOfChannels;
  }
  return output;
}

function encodePcm16Wav(samples: Float32Array, sampleRate: number): Blob {
  const bytesPerSample = 2;
  const dataLength = samples.length * bytesPerSample;
  const arrayBuffer = new ArrayBuffer(44 + dataLength);
  const view = new DataView(arrayBuffer);

  writeAscii(view, 0, "RIFF");
  view.setUint32(4, 36 + dataLength, true);
  writeAscii(view, 8, "WAVE");
  writeAscii(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * bytesPerSample, true);
  view.setUint16(32, bytesPerSample, true);
  view.setUint16(34, 16, true);
  writeAscii(view, 36, "data");
  view.setUint32(40, dataLength, true);

  samples.forEach((sample, index) => {
    const clamped = Math.max(-1, Math.min(1, sample));
    view.setInt16(44 + index * 2, clamped < 0 ? clamped * 0x8000 : clamped * 0x7fff, true);
  });
  return new Blob([arrayBuffer], { type: "audio/wav" });
}

export async function convertAudioToWav(audio: Blob): Promise<Blob> {
  const AudioContextClass = window.AudioContext;
  const context = new AudioContextClass();
  try {
    const decoded = await context.decodeAudioData(await audio.arrayBuffer());
    return encodePcm16Wav(resampleToMono(decoded, 16_000), 16_000);
  } finally {
    await context.close();
  }
}
