// scripts/build-icons.cjs
const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

// The source is now the user-provided PNG file.
const inputPngPath = path.resolve(__dirname, '../public/icon.png');
const outputDir = path.resolve(__dirname, '../public/build');

// Create output directory if it doesn't exist
if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
}

const outputPathIco = path.join(outputDir, 'icon.ico');
const outputPathPng = path.join(outputDir, 'icon.png'); // This will be the main PNG for the app

async function buildIcons() {
    console.log('[ICON] Starting icon generation from icon.png...');

    if (!fs.existsSync(inputPngPath)) {
        console.error(`[ICON] Error: Input file not found at ${inputPngPath}. Please make sure you have placed your icon.png in the 'public' directory.`);
        process.exit(1);
    }
    
    const inputBuffer = fs.readFileSync(inputPngPath);
    if (!inputBuffer || inputBuffer.length === 0) {
        console.error(`[ICON] Error: Input file at ${inputPngPath} is empty or invalid.`);
        process.exit(1);
    }

    try {
        // Generate the standard PNG for Linux/macOS and for the window icon (e.g., 512x512)
        // This also standardizes the output PNG format.
        await sharp(inputBuffer)
            .resize(512, 512)
            .toFile(outputPathPng);
        console.log(`[ICON] Successfully created ${outputPathPng}`);

        // Generate the ICO for Windows. Sharp can create ICO from a PNG buffer.
        // It's best to provide multiple sizes for ICO files, but a 256x256 ico file is sufficient for modern Windows.
        await sharp(inputBuffer)
            .resize(256, 256)
            .toFile(outputPathIco);
        console.log(`[ICON] Successfully created ${outputPathIco}`);

        console.log('[ICON] Icon generation finished successfully.');

    } catch (error) {
        console.error('[ICON] Failed to generate icons:', error);
        process.exit(1);
    }
}

buildIcons();
