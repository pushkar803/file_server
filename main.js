require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { nanoid } = require('nanoid');
const path = require('path');
const fs = require('fs');
const mime = require('mime-types');

const app = express();
const PORT = process.env.PORT || 3000;
const DOMAIN = process.env.DOMAIN || `http://localhost:${PORT}`;

const fileMap = new Map();
const upload = multer({ dest: 'uploads/' });

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

    const fileUrl = `${DOMAIN}/file/${id}`;
    res.json({ id, url: fileUrl });
});

app.get('/file/:id', (req, res) => {
    const fileRecord = fileMap.get(req.params.id);
    if (!fileRecord || !fs.existsSync(fileRecord.path)) {
        return res.status(404).json({ error: 'File not found' });
    }

    const mimeType = mime.lookup(fileRecord.originalName) || 'application/octet-stream';
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${fileRecord.originalName}"`);

    res.sendFile(path.resolve(fileRecord.path));
});

app.listen(PORT, () => {
    console.log(`🚀 Server running at ${DOMAIN}`);
});
