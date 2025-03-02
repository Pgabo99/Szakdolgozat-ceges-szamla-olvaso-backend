const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { pdfToPng } = require('pdf-to-png-converter');
const path = require('path');

const app = express()
const upload = multer({ dest: 'uploads/' }); // Ide menti a fájlokat
app.use(cors());

app.use(cors({
  origin: 'http://localhost:4200',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type']
}));

app.use('/images', express.static(path.join(__dirname, 'images')));

app.post('/processPDF', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nincs fájl feltöltve' });
  }
  console.log(req.file);
  const pdfPath = req.file.path;

  try {
    // Beolvassuk a fájlt
    const fileBuffer = fs.readFileSync(pdfPath);
    console.log('asd')

    // PDF-ből szöveg kinyerése
    const data = await pdfParse(fileBuffer);
    const extractedText = data.text.replaceAll(' ', '').replaceAll("\n", "").replaceAll("\t", "").replaceAll("\v", ""); // Minden szóközt eltávolítunk
    console.log(extractedText)
    console.log(data.text)
    if (extractedText !== "") {
      return res.json({ type: 'text', content: data.text });
    } else {
        const pngPages = await pdfToPng(pdfPath, {
            disableFontFace: true,
            useSystemFonts: true,
            enableXfa: false,
            viewportScale: 2.0,
            outputFolder: 'images',
            outputFileMaskFunc: (pageNumber) => `page_${pageNumber}.png`,
            pagesToProcess: [1],
            strictPagesToProcess: false,
            verbosityLevel: 0,
        });
        const imagePath = `page_1.png`; 
        res.json({ type: 'path', images: [{ path: imagePath }] });
    }
  } catch (error) {
    console.error('Hiba történt a PDF feldolgozásakor:', error);
    res.status(500).json({ error: 'Hiba történt a PDF feldolgozásakor' });
  }
});

app.post('/pdf-to-image', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nincs fájl feltöltve' });
  }

  const pdfPath = req.file.path;
  const outputPath = `uploads/${req.file.filename}.png`;

  const converter = fromPath(pdfPath, {
    density: 300, // DPI, jobb minőséghez növeld
    saveFilename: req.file.filename,
    savePath: './uploads',
    format: 'png',
    width: 1240,
    height: 1754,
  });

  try {
    await converter.convert(); // Az első oldalt alakítja képpé
    const imageBuffer = fs.readFileSync(outputPath);

    res.setHeader('Content-Type', 'image/png');
    res.send(imageBuffer);

    // Opcionálisan töröld a fájlokat
    setTimeout(() => {
      fs.unlinkSync(pdfPath);
      fs.unlinkSync(outputPath);
    }, 5000);
  } catch (error) {
    console.error('Hiba a PDF konvertálás során:', error);
    res.status(500).json({ error: 'Nem sikerült a PDF képpé alakítása' });
  }
});

app.listen(3000, () => console.log('Szerver fut a 3000-es porton'));
