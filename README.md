# Suprato 🎤✨

Suprato is a cutting-edge, real-time AI vocal monitor and pitch tracker. It leverages the state-of-the-art **SwiftF0** neural network algorithm via WebAssembly to provide highly accurate, low-latency pitch detection directly in the browser. It also features an AI Vocal Coach powered by the Gemini API to analyze your singing sessions and provide personalized feedback.

![Suprato Screenshot](https://picsum.photos/seed/suprato/800/400?blur=2)

## Features

- **Real-Time Pitch Trajectory:** Visualizes your pitch continuously on a scrolling canvas, allowing you to see your vibrato, scoops, and pitch stability.
- **SwiftF0 Neural Engine:** Uses the lightweight, highly accurate SwiftF0 CNN model running entirely client-side via ONNX Runtime Web.
- **AI Vocal Coach:** Records your session data and uses Google's Gemini AI to provide a personalized, encouraging critique of your pitch accuracy.
- **Session Range Tracker:** Automatically logs the highest and lowest notes hit during your session to map out your vocal range.
- **Pro Audio UI:** Designed with a sleek, dark-mode interface inspired by professional studio hardware.

## Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS, Lucide React (Icons)
- **Audio Processing:** Web Audio API, ONNX Runtime Web (`onnxruntime-web`)
- **AI Integration:** `@google/genai` (Gemini API)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- A Google Gemini API Key (for the AI Vocal Coach feature)

### Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/suprato.git
   cd suprato
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up environment variables:
   Create a `.env` file in the root directory and add your Gemini API key:
   ```env
   VITE_GEMINI_API_KEY=your_api_key_here
   ```
   *(Note: In the AI Studio environment, `process.env.GEMINI_API_KEY` is automatically injected).*

4. Start the development server:
   ```bash
   npm run dev
   ```

5. Open your browser and navigate to `http://localhost:3000`.

## Usage

1. Click **Start Monitoring** and grant microphone permissions.
2. Sing into your microphone. Watch the pitch trajectory graph and the cents deviation bar.
3. Click **Stop Monitoring** when you are finished.
4. Click **Analyze Session** in the AI Vocal Coach panel to receive personalized feedback on your performance.

## Architecture

- `src/App.tsx`: Main application component containing the UI and audio loop logic.
- `src/lib/swiftf0.ts`: Handles the initialization and execution of the SwiftF0 ONNX model using `onnxruntime-web`.
- `src/lib/pitch.ts`: Contains utility functions for converting frequencies to musical notes and calculating cents deviation.

## Acknowledgements

- [SwiftF0](https://github.com/lars76/swift-f0) by lars76 for the incredible monophonic pitch detection model.
- [Google Gemini](https://ai.google.dev/) for powering the AI Vocal Coach.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
