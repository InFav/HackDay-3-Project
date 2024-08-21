import express from 'express';
import cors from 'cors';
import multer from 'multer';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { GoogleAIFileManager } from '@google/generative-ai/server';
import fs from 'fs';

const app = express();
const upload = multer({ dest: 'uploads/' });

const apiKey = 'AIzaSyAHCaQ4LMUzg_hjizorUW69lBINGnDy1PY'; // Replace with your actual API key
const genAI = new GoogleGenerativeAI(apiKey);

app.use(cors());
app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Helper function to clean up uploaded files
function cleanUpFiles(files) {
  files.forEach(file => {
    fs.unlink(file.path, err => {
      if (err) console.error('Error deleting file:', err);
    });
  });
}

app.post('/analyze', upload.array('images'), async (req, res) => {
  console.log('Analyze request received');
  try {
    const fileManager = new GoogleAIFileManager(apiKey);
    const files = req.files;
    const { persona, postPurpose, personalStory } = req.body;

    if (!files || files.length === 0) {
      return res.status(400).send('No files uploaded.');
    }

    const uploadedFiles = [];
    for (const file of files) {
      const uploadedFile = await fileManager.uploadFile(file.path, {
        mimeType: file.mimetype,
        displayName: file.originalname,
      });
      uploadedFiles.push(uploadedFile.file);
      console.log('Uploaded file:', uploadedFile);
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const parts = uploadedFiles.map(file => ({
      fileData: {
        mimeType: file.mimeType,
        fileUri: file.uri,
      },
    }));

    // Construct the input prompt for the AI model
    parts.unshift({ text: `input: images of LinkedIn posts and their analytics, focusing on demographics, engagement, and the writing style of the user.` });
    parts.push({ text: 'output: Analyze the writing style of the following LinkedIn posts and provide a comprehensive breakdown. Focus on the following aspects: Tone and language used (e.g., formal, conversational, motivational), Structure and formatting (e.g., use of headings, bullet points, paragraphs), Common phrases or jargon, Call-to-action techniques. Provide the analysis in JSON format.' });

    const generationConfig = {
      temperature: 1,
      topP: 0.95,
      topK: 64,
      maxOutputTokens: 8192,
      responseMimeType: 'text/plain', // Ensure this matches the expected format
    };

    const result = await model.generateContent(parts, generationConfig);
    const analytics = result.response.text();
    console.log('Analytics:', analytics);

    let analyticsJson;
    try {
      // Attempt to parse the response as JSON
      analyticsJson = JSON.parse(analytics);
    } catch (parseError) {
      console.warn('Failed to parse analytics as JSON, treating as plain text:', analytics);
      analyticsJson = { text: analytics }; // Treat as plain text if JSON parsing fails
    }

    // Second prompt: Generate a new LinkedIn post based on the analytics, persona, purpose, and personal story
    const prompt = `As a sophisticated LinkedIn post generation tool, your objective is to produce a visually striking and high-engagement LinkedIn post tailored to the persona: ${persona}. Utilize the analytics data: ${JSON.stringify(analyticsJson)} to craft content that resonates deeply and achieves the desired outcome. The purpose of the post is: "${postPurpose}". Weave in this personal story: "${personalStory}" to make the content more relatable and impactful. The post must align perfectly with the persona’s unique style, engaging their audience and driving strong interaction.`;

    const linkedinParts = [{ text: prompt }];
    const linkedinResult = await model.generateContent(linkedinParts, generationConfig);

    console.log('LinkedIn Post:', linkedinResult.response.text());
    res.send(linkedinResult.response.text());
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).send('Internal Server Error');
  } finally {
    cleanUpFiles(req.files); // Clean up the uploaded files after processing
  }
});

app.post('/regenerate', async (req, res) => {
  console.log('Regenerate request received');
  try {
    const { persona, postPurpose, personalStory, lastGeneratedPost } = req.body;

    // Log input data for debugging
    console.log('Received data:', { persona, postPurpose, personalStory, lastGeneratedPost });

    if (!lastGeneratedPost) {
      return res.status(400).send('Last generated post is required.');
    }

    // Construct the prompt for regenerating the LinkedIn post
    const prompt = `Regenerate the LinkedIn post tailored for the persona: ${persona}. Use the following previous post as context: "${lastGeneratedPost}". The purpose of the post is: "${postPurpose}". Additionally, weave in this personal story: "${personalStory}".`;

    // Log the prompt for debugging
    console.log('Generated Prompt:', prompt);

    const linkedinParts = [{ text: prompt }];
    const linkedinModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

    const linkedinResult = await linkedinModel.generateContent(linkedinParts);

    // Log the result for debugging
    console.log('Regenerated LinkedIn Post:', linkedinResult.response.text());
    res.send(linkedinResult.response.text());
  } catch (error) {
    // Log the specific error message
    console.error('Error during regeneration:', error.message);
    res.status(500).send('Failed to regenerate LinkedIn post');
  }
});


app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});