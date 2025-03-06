const { ipcRenderer } = require('electron')

// Get UI elements
const statusElement = document.getElementById('status')
const serverAddressInput = document.getElementById('serverAddress')
const connectBtn = document.getElementById('connectBtn')

// Handle connection
connectBtn.addEventListener('click', () => {
    const serverAddress = serverAddressInput.value
    ipcRenderer.send('connect', serverAddress)
})

// Update status
ipcRenderer.on('status', (event, status) => {
    statusElement.textContent = status
})

// Handle view updates
ipcRenderer.on('view-update', (event, frameData) => {
    const canvas = document.getElementById('botView')
    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.src = frameData
    img.onload = () => {
        ctx.drawImage(img, 0, 0)
    }
})

// Keyboard controls
document.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase()
    if (['w', 'a', 's', 'd'].includes(key)) {
        ipcRenderer.send('move', key)
    }
})

document.addEventListener('keyup', () => {
    ipcRenderer.send('stop-move')
})

// Mouse controls
let mouseDown = false
let lastX = 0
let lastY = 0

document.addEventListener('mousedown', (e) => {
    mouseDown = true
    lastX = e.clientX
    lastY = e.clientY
})

document.addEventListener('mouseup', () => {
    mouseDown = false
})

document.addEventListener('mousemove', (e) => {
    if (mouseDown) {
        const deltaX = e.clientX - lastX
        const deltaY = e.clientY - lastY
        ipcRenderer.send('look', { deltaX, deltaY })
        lastX = e.clientX
        lastY = e.clientY
    }
})
