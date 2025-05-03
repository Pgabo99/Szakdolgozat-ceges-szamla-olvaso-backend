const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const pdfParse = require('pdf-parse');
const { pdfToPng } = require('pdf-to-png-converter');
const path = require('path');

const app = express();

// Az ideiglenes fájltárolás a helyi rendszerben
const upload = multer({ dest: './tmp/uploads/' }); // Helyi mappa

app.use(cors());

app.use('/images', express.static(path.join(__dirname, './tmp/uploads'))); // A fájlokat innen érhetjük el

// PDF feldolgozó endpoint
app.post('/processPDF', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Nincs fájl feltöltve' });
  }

  const pdfPath = req.file.path; // A fájl ideiglenesen ide lesz mentve

  try {
    const fileBuffer = fs.readFileSync(pdfPath);

    // PDF-ből szöveg kinyerése
    const data = await pdfParse(fileBuffer);
    const extractedText = data.text.replaceAll(' ', '').replaceAll("\n", "").replaceAll("\t", "").replaceAll("\v", "");

    if (extractedText !== "") {
      return res.json({ type: 'text', content: data.text });
    } else {
      // PDF konvertálása képpé
      const pngPages = await pdfToPng(pdfPath, {
        disableFontFace: true,
        useSystemFonts: true,
        enableXfa: false,
        viewportScale: 2.0,
        outputFolder: './tmp/uploads', // Kép ide kerül
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

app.use(express.static(path.join(__dirname, './browser')));
app.get('/kezdooldal', (req, res) => {
  res.sendFile(path.join(__dirname, './browser/index.html'));
})

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, './browser/index.html'));
})

// Express szerver indítása
app.listen(3000, () => console.log('Szerver fut a 3000-es porton'));
