require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { nanoid } = require('nanoid');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');
const ngrok = require('@ngrok/ngrok');

const app = express();
const PORT = process.env.PORT || 3000;
const NGROK_STATIC_DOMAIN = process.env.NGROK_STATIC_DOMAIN;
let DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`;

const fileMap = new Map();
const upload = multer({ dest: 'uploads/' });

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const ext = path.extname(req.file.originalname);
    const id = nanoid(10);
    const newFilename = `${id}${ext}`;
    const newPath = path.join('uploads', newFilename);

    fs.renameSync(req.file.path, newPath);

    fileMap.set(id, {
        path: newPath,
        originalName: req.file.originalname
    });

    const fileUrl = `${DOMAIN}/file/${id}${ext}`;
    res.json({
        id,
        url: fileUrl,
        extension: ext.slice(1) // Remove the dot from extension
    });
});

app.get('/file/:id', (req, res) => {
    const id = req.params.id.split('.')[0]; // Remove extension from id if present
    const fileRecord = fileMap.get(id);
    if (!fileRecord || !fs.existsSync(fileRecord.path)) {
        return res.status(404).json({ error: 'File not found' });
    }

    const mimeType = mime.lookup(fileRecord.originalName) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalName}"`);

    res.sendFile(path.resolve(fileRecord.path));
});

const startServer = async () => {
    try {
        // Start the Express server
        const server = app.listen(PORT, () => {
            console.log(`🚀 Local server running at http://localhost:${PORT}`);
        });

        // Start ngrok tunnel with static domain if configured
        if (NGROK_STATIC_DOMAIN) {
            const listener = await ngrok.forward({
                addr: PORT,
                authtoken: process.env.NGROK_AUTH_TOKEN,
                domain: NGROK_STATIC_DOMAIN
            });

            DOMAIN = listener.url();
            console.log(`🌍 Public ngrok URL: ${DOMAIN}`);

            // Handle cleanup on server shutdown
            process.on('SIGTERM', async () => {
                await listener.close();
                server.close();
            });
        } else {
            console.log('\n⚠️  No NGROK_STATIC_DOMAIN set in .env file');
            console.log('💡 Add your static domain to .env if you want to use it');
        }
    } catch (error) {
        console.error('Error starting server:', error);
        if (error.message.includes('authtoken')) {
            console.log('\n⚠️  To use ngrok, please set your NGROK_AUTH_TOKEN in the .env file');
            console.log('💡 Get your auth token from: https://dashboard.ngrok.com/get-started/your-authtoken');
        }
    }
};

startServer();
