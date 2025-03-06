const mineflayer = require('mineflayer')
const { ipcMain, BrowserWindow } = require('electron')
const { mineflayer: prismarineViewer } = require('prismarine-viewer')

let bot = null
let viewer = null
let viewerWindow = null

ipcMain.on('connect', (event, serverAddress) => {
    if (bot) {
        bot.end()
    }

    bot = mineflayer.createBot({
        host: serverAddress,
        username: 'ElectronBot',
        viewDistance: 'tiny'
    })

    // Create a new window for the viewer
    if (viewerWindow) viewerWindow.close()
    viewerWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        }
    })

    // Initialize viewer after bot spawn
    bot.once('spawn', () => {
        if (viewer) viewer.close()
        try {
            viewer = prismarineViewer(bot, {
                port: 3007,
                firstPerson: true,
                output: (frame) => {
                    event.sender.send('view-update', frame.toDataURL())
                },
                width: 640,
                height: 360
            })
            
            // Wait 1 second for server to initialize before loading
            setTimeout(() => {
                if (viewerWindow) {
                    viewerWindow.loadURL('http://localhost:3007')
                        .catch(err => {
                            console.error('Failed to load viewer:', err)
                            event.sender.send('status', 'Viewer Loading Error')
                        })
                }
            }, 1000)
        } catch (err) {
            console.error('Error initializing viewer:', err)
            event.sender.send('status', 'Viewer Error: ' + err.message)
        }
    })


    // Wait for viewer server to be ready before loading
    const loadViewerWindow = () => {
        if (viewerWindow) {
            viewerWindow.loadURL(`http://localhost:3007`)
                .catch(() => {
                    // Retry after 1 second if failed
                    setTimeout(loadViewerWindow, 1000)
                })
        }
    }

    bot.on('login', () => {
        event.sender.send('status', 'Connected')
        // Start loading the viewer window after successful login
        loadViewerWindow()
    })

    bot.on('end', () => {
        event.sender.send('status', 'Disconnected')
        if (viewer) viewer.close()
        if (viewerWindow) viewerWindow.close()
    })

    bot.on('error', (err) => {
        console.error(err)
        event.sender.send('status', 'Error: ' + err.message)
        if (viewer) viewer.close()
        if (viewerWindow) viewerWindow.close()
    })
})

// Movement handling with continuous state tracking
const movementState = {
    forward: false,
    back: false,
    left: false,
    right: false
}

ipcMain.on('move', (event, direction) => {
    if (!bot) return
    
    const movementMap = {
        w: 'forward',
        a: 'left',
        s: 'back',
        d: 'right',
        " ": "jump"
    }
    
    const movement = movementMap[direction]
    if (movement) {
        movementState[movement] = true
        bot.setControlState(movement, true)
    }
})

ipcMain.on('stop-move', () => {
    if (!bot) return
    
    // Reset all movement states
    for (const key in movementState) {
        movementState[key] = false
        bot.setControlState(key, false)
    }
})


ipcMain.on('stop-move', () => {
    if (!bot) return
    
    // Stop all movement
    bot.setControlState('forward', false)
    bot.setControlState('back', false)
    bot.setControlState('left', false)
    bot.setControlState('right', false)
})

// Mouse look handling
ipcMain.on('look', (event, { deltaX, deltaY }) => {
    if (!bot) return
    
    const sensitivity = 0.005
    const yaw = bot.entity.yaw - deltaX * sensitivity
    const pitch = bot.entity.pitch - deltaY * sensitivity
    
    bot.look(yaw, pitch)
})
