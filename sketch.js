// Alan Ren
// Fall 2024
// NYU ITP

let conversationHistory = [];
let inputField;
let submitButton;
let chatContainer;
let fileInput;
let previewContainer;
let inputContainer;
let currentImageBase64 = null;

const systemPrompt = "You are a helpful assistant. Please provide responses in plain text only, without using markdown, HTML, or any other formatting. Keep your responses clear and concise.";

function setup() {
  // Initialize conversation with system prompt
  conversationHistory.push({
    role: 'system',
    content: systemPrompt
  });

  // Get references to DOM elements
  chatContainer = select('#chat-container');
  inputContainer = select('#input-container');
  inputField = select('#message-input');
  submitButton = select('#submit-button');
  fileInput = select('#file-input');
  previewContainer = select('#preview-container');

  // Set up event listeners
  submitButton.mousePressed(sendMessage);
  inputField.elt.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      sendMessage();
    }
  });

  setupDragAndDrop();
}

function setupDragAndDrop() {
  fileInput.elt.addEventListener('change', handleFileSelect);

  inputContainer.elt.addEventListener('dragover', (e) => {
    e.preventDefault();
    inputContainer.elt.classList.add('drag-over');
  });

  inputContainer.elt.addEventListener('dragleave', (e) => {
    e.preventDefault();
    inputContainer.elt.classList.remove('drag-over');
  });

  inputContainer.elt.addEventListener('drop', handleDrop);
}

function handleDrop(e) {
  e.preventDefault();
  inputContainer.elt.classList.remove('drag-over');

  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) {
    processImage(file);
  }
}

function handleFileSelect(e) {
  const file = e.target.files[0];
  if (file && file.type.startsWith('image/')) {
    processImage(file);
  }
}

function createClearImageButton() {
  const clearBtn = createElement('div', '×');
  clearBtn.class('clear-image');
  clearBtn.mousePressed(() => {
    currentImageBase64 = null;
    previewContainer.elt.innerHTML = '';
    // Reset conversation history but keep system prompt
    conversationHistory = [conversationHistory[0]];
  });
  return clearBtn;
}

function processImage(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    currentImageBase64 = e.target.result.split(',')[1];

    previewContainer.elt.innerHTML = '';

    const img = createElement('img');
    img.elt.src = e.target.result;
    img.parent(previewContainer);

    const clearBtn = createClearImageButton();
    clearBtn.parent(previewContainer);

    // Reset conversation history but keep system prompt
    conversationHistory = [conversationHistory[0]];
  };

  reader.readAsDataURL(file);
}

function addMessageToChat(role, content) {
  const isUser = role === 'user';
  let messageDiv = createDiv("");
  messageDiv.parent(chatContainer);
  messageDiv.class("message");
  messageDiv.addClass(isUser ? "user-message" : "bot-message");

  messageDiv.html(`
    <div class="message-header">
      <strong>${isUser ? "You" : "Assistant"}</strong>
    </div>
    <div class="message-content">
      ${content}
    </div>
  `);

  chatContainer.elt.scrollTop = chatContainer.elt.scrollHeight;
  return messageDiv;
}

async function sendMessage() {
  const userInput = inputField.elt.value;
  if (!userInput && !currentImageBase64) return;

  inputField.elt.value = "";

  // Add user message to conversation and display
  const userMessage = {
    role: 'user',
    content: userInput,
    ...(currentImageBase64 && { images: [currentImageBase64] })
  };
  conversationHistory.push(userMessage);
  addMessageToChat('user', userInput);

  // Show loading state
  document.body.style.cursor = "progress";
  submitButton.elt.disabled = true;
  const loadingMessage = addMessageToChat('assistant', "Processing your request...");

  try {
    const response = await fetch('http://localhost:11434/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: "llama3.2-vision",
        messages: conversationHistory,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    const reply = data.message.content;

    // Remove loading message and add assistant's response
    loadingMessage.remove();
    addMessageToChat('assistant', reply);

    // Add assistant's response to conversation history
    conversationHistory.push({
      role: 'assistant',
      content: reply
    });

  } catch (error) {
    console.error('Error:', error);
    loadingMessage.remove();
    addMessageToChat('assistant', "Sorry, there was an error processing your request.");
  }

  // Reset UI state
  document.body.style.cursor = "default";
  submitButton.elt.disabled = false;
}