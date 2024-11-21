const express = require('express');
const multer = require('multer');
const fs = require('fs');
const base64 = require('base64-js');
const axios = require('axios');
const path = require('path');

// Set up multer to handle file uploads
const upload = multer({ dest: 'uploads/' });

const app = express();
const port = 3000;

// Middleware to serve static files (like your HTML form)
app.use(express.static('public'));
app.use(express.json());

// Endpoint to handle file upload and prediction request
app.post('/predict', upload.single('image'), async (req, res) => {
  try {
    const imagePath = req.file.path; // Path to uploaded file

    // Read the image file
    const imageBytes = await fs.promises.readFile(imagePath);
    const base64Image = base64.fromByteArray(imageBytes);

    // Create the JSON object
    const jsonObject = {
      instances: [
        {
          content: base64Image, // Base64-encoded image content
        },
      ],
      parameters: {
        confidenceThreshold: 0.5,
        maxPredictions: 5,
      },
    };

    // Send the prediction request to Google Vertex AI
    const predictionResponse = await sendPredictionRequest(jsonObject);

    // Display the prediction results
    displayPredictionResults(predictionResponse.data);

    // Return the response to the frontend
    res.json(predictionResponse.data);
  } catch (error) {
    console.error('Error during prediction request:', error);
    res.status(500).send('Error during prediction request');
  }
});

// Function to send the prediction request to Google Vertex AI
const sendPredictionRequest = async (jsonObject) => {
  try {
    const accessToken = await getAccessToken();
    const endpoint = `https://us-central1-aiplatform.googleapis.com/v1/projects/1080625303466/locations/us-central1/endpoints/3404564088129323008:predict`;

    const response = await axios.post(endpoint, jsonObject, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    return response;
  } catch (error) {
    console.error('Error sending prediction request:', error);
    throw error;
  }
};

// Function to get the access token
const getAccessToken = async () => {
  const { execSync } = require('child_process');
  try {
    const token = execSync('gcloud auth print-access-token').toString().trim();
    return token;
  } catch (error) {
    console.error('Error fetching access token:', error);
    throw error;
  }
};

// Function to display the prediction results
const displayPredictionResults = (data) => {
  if (data && data.predictions && data.predictions.length > 0) {
    data.predictions.forEach((prediction, index) => {
      console.log(`Prediction ${index + 1}:`);

      const displayNames = prediction.displayNames || [];
      const confidences = prediction.confidences || [];
      const ids = prediction.ids || [];

      displayNames.forEach((name, i) => {
        console.log(`  Label: ${name}`);
        console.log(`  Confidence: ${confidences[i]}`);
        console.log(`  ID: ${ids[i]}`);
      });
    });
  } else {
    console.log('No predictions returned.');
  }
};

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
