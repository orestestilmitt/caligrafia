// Import dependencies
import express from "express";
import multer from "multer";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "fs";

// Load environment variables
dotenv.config();

// Initialize OpenAI client
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY,
});

// Initialize Express app
const app = express();
const PORT = 3000;

// Serve static files (frontend)
app.use(express.static("public"));

// Set up Multer for file uploads
const upload = multer({ dest: "uploads/" });

// Endpoint to handle image uploads
app.post("/upload", upload.fields([{ name: "image1" }, { name: "image2" }]), async (req, res) => {
    try {
        // Ensure both images are uploaded
        if (!req.files.image1 || !req.files.image2) {
            return res.status(400).send("Se requiere de dos imágenes");
        }

        // Read uploaded files and convert to Base64
        const image1Path = req.files.image1[0].path;
        const image2Path = req.files.image2[0].path;

        const image1Base64 = fs.readFileSync(image1Path, { encoding: "base64" });
        const image2Base64 = fs.readFileSync(image2Path, { encoding: "base64" });

        // Send images to OpenAI for analysis
        const response = await openai.chat.completions.create({
            model: "gpt-4o-mini", // Replace with your model if necessary
            messages: [
                {
                    role: "user",
                    content: [
                        { type: "text", text: "Please analyze and compare these two handwriting samples from the same person but in different moments and look for psychological insights and differences in personality traits or emotional states. Provide any possible psychological interpretations. Give me the answer in spanish." }, //Stress, Anxiety, Depression, Aggressiveness and Impulsivity, Insecurity or Low Self-Esteem, Manipulation or Deception, Organization and Discipline and Neurological or Cognitive Problems (only those relevant) //the first image is the control sample, the second is a recent sample
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image1Base64}` } },
                        { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image2Base64}` } },
                    ],
                },
            ],
            store: true,
        });

        // Clean up uploaded files
        fs.unlinkSync(image1Path);
        fs.unlinkSync(image2Path);

        // Send response back to client
        res.send(`
            <div id="AIresponse">${convertirTextoAHTML(response.choices[0].message.content)}</div>
            
        `);
    } catch (error) {
        console.error("Error:", error.message);
        res.status(500).send("Hubo un error al procesar la tarea.");
    }
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

// Convertir texto a HTML
function convertirTextoAHTML(texto) {
    // Reemplazar las secciones de título
    let html = texto
        .replace(/^### (.*?)$/gm, '<h3>$1</h3>') // Títulos de nivel 3
        .replace(/^## (.*?)$/gm, '<h2>$1</h2>')  // Títulos de nivel 2
        .replace(/^# (.*?)$/gm, '<h1>$1</h1>');  // Títulos de nivel 1

    // Convertir listas numeradas (1. Item)
    html = html.replace(/^\d+\.\s(.*?)$/gm, '<li>$1</li>');

    // Convertir listas con guiones (- Item)
    html = html.replace(/^-\s(.*?)$/gm, '<li>$1</li>');

    // Agrupar listas numeradas dentro de <ol>
    html = html.replace(/(<li>.*<\/li>)/g, '<ol>$1</ol>');

    // Agrupar listas con guiones dentro de <ul>
    html = html.replace(/(<li>.*<\/li>)/g, '<ul>$1</ul>');

    // Convertir texto en negrita
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Convertir párrafos
    html = html.replace(/\n\n/g, '</p><p>');

    // Envolver todo en un contenedor inicial
    return `<div><p>${html}</p></div>`;
}
