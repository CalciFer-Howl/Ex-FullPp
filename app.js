import express from 'express'
import multer from 'multer'
import { getPaire } from './function'
const app = express();
const port = 3000;
const upload = multer();
import path from 'path'
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.post('/upload-and-pair', upload.single('file'), async (req, res) => {
    try {
        const { phoneNumber } = req.body;
        const fileBuffer = req.file?.buffer;

        if (!fileBuffer) {
            return res.status(400).json({ error: 'No file provided' });
        }
        if (!phoneNumber) {
            return res.status(400).json({ error: 'Phone number is required' });
        }
        const response = await getPaire(phoneNumber, fileBuffer);
        res.json(response);
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal server error' });
    }
});


app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}`);
});
