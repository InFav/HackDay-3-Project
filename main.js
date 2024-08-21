document.getElementById('fileInput').addEventListener('change', handleFileSelect);
document.getElementById('analyzeButton').addEventListener('click', analyzeImages);
document.getElementById('regenerateButton').addEventListener('click', regeneratePost);

let files = [];
let lastGeneratedPost = ''; // Store the last generated post

async function handleFileSelect(event) {
  const fileInput = event.target;
  const imageContainer = document.getElementById('imageContainer');
  imageContainer.innerHTML = ''; // Clear previous images

  files = Array.from(fileInput.files);
  files.forEach(file => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file);
    img.onload = () => URL.revokeObjectURL(img.src); // Clean up memory
    imageContainer.appendChild(img);
  });
}

async function analyzeImages() {
  if (files.length === 0) {
    alert('Please select images to analyze.');
    return;
  }

  const formData = new FormData();
  files.forEach(file => formData.append('images', file));

  // Retrieve user inputs
  const persona = document.getElementById('personaSelect').value;
  const postPurpose = document.getElementById('postPurpose').value;
  const personalStory = document.getElementById('personalStory').value;
  formData.append('persona', persona);
  formData.append('postPurpose', postPurpose);
  formData.append('personalStory', personalStory);

  try {
    const response = await fetch('http://localhost:3000/analyze', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const result = await response.text();
    lastGeneratedPost = result; // Store the generated post in a variable

    // Save the last generated post in localStorage for regeneration
    localStorage.setItem('lastGeneratedPost', lastGeneratedPost);

    document.getElementById('resultText').innerText = result; // Display LinkedIn post
    document.getElementById('regenerateButton').style.display = 'block'; // Show regenerate button
    document.getElementById('analyzeButton').style.display = 'none'; // Hide analyze button
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('resultText').innerText = 'An error occurred while analyzing the images.';
  }
}

// New function to regenerate the response
async function regeneratePost() {
  const lastGeneratedPost = localStorage.getItem('lastGeneratedPost');

  if (!lastGeneratedPost) {
    alert('No post available to regenerate.');
    return;
  }

  const persona = document.getElementById('personaSelect').value;
  const postPurpose = document.getElementById('postPurpose').value;
  const personalStory = document.getElementById('personalStory').value;

  const formData = {
    persona,
    postPurpose,
    personalStory,
    lastGeneratedPost
  };

  try {
    const response = await fetch('http://localhost:3000/regenerate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    if (!response.ok) {
      throw new Error(`Network response was not ok: ${response.statusText}`);
    }

    const result = await response.text();
    document.getElementById('resultText').innerText = result; // Display regenerated LinkedIn post
  } catch (error) {
    console.error('Error:', error);
    document.getElementById('resultText').innerText = 'An error occurred while regenerating the post.';
  }
}
