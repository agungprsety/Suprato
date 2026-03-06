import * as ort from 'onnxruntime-web';

let session: ort.InferenceSession | null = null;

export async function initSwiftF0() {
  if (!session) {
    // Configure ONNX Runtime Web to use the WASM backend
    ort.env.wasm.wasmPaths = 'https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/';
    
    session = await ort.InferenceSession.create(
      'https://raw.githubusercontent.com/lars76/swift-f0/main/swift_f0/model.onnx',
      { executionProviders: ['wasm'] }
    );
  }
}

export async function detectPitchSwiftF0(audio16k: Float32Array): Promise<{ pitch: number, confidence: number }> {
  if (!session) {
    throw new Error("SwiftF0 session not initialized");
  }

  // Pad to minimum length if needed (256 samples)
  let input = audio16k;
  if (input.length < 256) {
    input = new Float32Array(256);
    input.set(audio16k);
  }

  const inputName = session.inputNames[0];
  const tensor = new ort.Tensor('float32', input, [1, input.length]);
  const feeds = { [inputName]: tensor };

  const results = await session.run(feeds);
  
  // The model returns two outputs: pitch_hz and confidence
  const pitchOutput = results[session.outputNames[0]];
  const confOutput = results[session.outputNames[1]];

  const pitches = pitchOutput.data as Float32Array;
  const confidences = confOutput.data as Float32Array;

  // Find the frame with the highest confidence, or just take the last one
  let bestPitch = -1;
  let bestConf = -1;

  for (let i = 0; i < confidences.length; i++) {
    if (confidences[i] > bestConf) {
      bestConf = confidences[i];
      bestPitch = pitches[i];
    }
  }

  return { pitch: bestPitch, confidence: bestConf };
}
