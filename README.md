# Nuxion

Nuxion is a next-generation desktop application designed for gamers, featuring a powerful overlay system, social features, and extensive customization. Built with performance and extensibility in mind using **Tauri v2** and **Next.js**.

## 🚀 Features

### Current Features
- **Modern UI**: Clean and responsive interface built with Tailwind CSS and Radix UI.
- **Customizable Overlays**: Specialized overlay windows for various in-game utilities (e.g., Crosshair).
- **Auto-Update**: Seamless background updates to keep you on the latest version.
- **System Tray Integration**: Minimal resource usage with daemon support.

### 🔮 Upcoming Features
- **DirectX/OpenGL Overlay Integration**: Native hooking into games for a seamless, high-performance overlay experience (Current Focus).
- **Clipping & Recording**: Capture your best gaming moments instantly with high-quality, lightweight recording tools.
- **Social System**: Connect with friends, send messages, and share clips directly through the platform.
- **Plugin/Extension Architecture**: Community-driven ecosystem allowing developers to create custom widgets, themes, and tools.
- **Cloud Sync**: Save your configuration, macros, and preferences to the cloud to use across multiple devices.
- **Performance Monitoring**: Real-time stats for FPS, CPU, and GPU usage layered directly over your game.

## 🛠️ Tech Stack

- **Frontend**: [Next.js](https://nextjs.org/) (React), [Tailwind CSS](https://tailwindcss.com/)
- **Backend/Core**: [Rust](https://www.rust-lang.org/), [Tauri v2](https://tauri.app/)
- **Services/Binaries**: [Golang](https://golang.org/) used in [service-go](https://github.com/Nuxion-Dev/service-go), [C#](https://docs.microsoft.com/en-us/dotnet/csharp/) used in [DXGI-Capture](https://github.com/Nuxion-Dev/DXGI-Capture), [Rust](https://www.rust-lang.org/) used in [overlay](src-tauri/crates/overlay)
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) (Radix UI)

## 💻 Development

### Prerequisites
- [Node.js](https://nodejs.org/) (Latest LTS recommended)
- [npm](https://www.npmjs.com/)
- [Rust](https://www.rust-lang.org/tools/install)

### Setup
1. Clone the repository:
   ```bash
   git clone https://github.com/Nuxion-Dev/app.git
   cd app
   ```
2. Install dependencies:
   ```bash
   npm install
   ```

### Running (Development)
Start the frontend and Tauri backend in development mode:
```bash
npx tauri dev
```

### Building (Production)
Build the application for distribution:
```bash
npm run bundle
```
*Note: The bundling script handles versioning and signing automatically.*

## 🤝 Contributing
Contributions are welcome! Please check the issues tab for current tasks or join our community to discuss new ideas.

## 📄 License
[MIT License](LICENSE)
