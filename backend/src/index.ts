import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import cors from 'cors';
import path from 'path';
import fs from 'fs';

const app = express();
const port = 5000;

// Middleware
app.use(cors());
app.use(express.json()); // To parse JSON bodies

// Multer setup to store the uploaded image in memory
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Serve static files
app.use('/files', express.static(path.join(__dirname, '')));

// Handle image upload and processing
app.post('/upload', upload.single('image'), async (req, res) => {
  try {
    const file = req.file;
    const { brightness, contrast, saturation, rotation, format } = req.body;

    if (!file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const parsedBrightness = parseFloat(brightness) || 1;
    const parsedContrast = parseFloat(contrast) || 1;
    const parsedSaturation = parseFloat(saturation) || 1;
    const parsedRotation = parseFloat(rotation) || 0;

    let image = sharp(file.buffer)
      .rotate(parsedRotation)
      .modulate({
        brightness: parsedBrightness,
        saturation: parsedSaturation,
      });

    if (parsedContrast !== 1) {
      image = image.linear(parsedContrast, -(128 * (parsedContrast - 1)));
    }

    let outputImage;
    if (format === 'png') {
      outputImage = image.png({ quality: 100 });
    } else {
      outputImage = image.jpeg({ quality: 100 });
    }

    const lowQualityImageBuffer = await image.resize({ width: 100 }).toBuffer();
    const previewUrl = `data:image/${format};base64,${lowQualityImageBuffer.toString('base64')}`;

    const processedImageBuffer = await outputImage.toBuffer();
    const filePath = path.join(__dirname, 'processed_image.' + format);
    fs.writeFileSync(filePath, processedImageBuffer);

    res.json({
      previewUrl,
      downloadUrl: `/files/processed_image.${format}`
    });
  } catch (error) {
    console.error('Error processing image:', error);
    res.status(500).send('Error processing image');
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
