# 🐺 DevHound

**Autonomous code healing powered by the Ralph Loop.**

## Quick Start (Testing)

### 1. Start the Mock Neural Bridge
```bash
cd devhound-vscode
npm install
node test/mock-bridge.js
```

You should see:
🐺 DEVHOUND MOCK NEURAL BRIDGE
Bridge online at http://localhost:4000

### 2. Compile the Extension
```bash
npm run compile
```

### 3. Test in VS Code

1. Open the `devhound-vscode` folder in VS Code
   (`code devhound-vscode` from the terminal works great)
2. Press `F5` to launch an **Extension Development Host**
3. Open any `.ts` or `.js` file
4. Press `Ctrl+Shift+D` to scan
5. Press `Ctrl+Shift+H` to heal

## Commands

| Command | Shortcut | Description |
|---------|----------|-------------|
| `DevHound: Scan Current File` | `Ctrl+Shift+D` | Find issues |
| `DevHound: Auto-Heal Current File` | `Ctrl+Shift+H` | Fix all issues |
| `DevHound: Toggle Auto-Fix on Save` | — | Enable/disable auto‑fix |
| `DevHound: Show Connection Status` | — | Check bridge connection |

## Test File

Create a file called `test.ts` with intentionally bad code:
```typescript
var userName = "Commander"
const isReady = true

if (userName == "Commander") {
    console.log("Hello")
}

function greet(name) {
    return "Hello, " + name
}
```

Then scan and heal to see DevHound in action!

---

Built with 🐺 by Colony OS
