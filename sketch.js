let chatHistory = [];
let inputField;
let submitButton;
let chatContainer;
let fileInput;
let previewContainer;
let inputContainer;
let currentImageBase64 = null;
let conversationHistory = [];

const systemPrompt = "You are a helpful assistant. Please provide responses in plain text only, without using markdown, HTML, or any other formatting. Keep your responses clear and concise.";

function setup() {
  // Chat container setup
  chatContainer = select('#chat-container');

  // Get references to DOM elements
  inputContainer = select('#input-container');
  inputField = select('#message-input');
  submitButton = select('#submit-button');
  fileInput = select('#file-input');
  previewContainer = select('#preview-container');

  // Set up event listeners
  submitButton.mousePressed(handleSubmit);
  inputField.elt.addEventListener("keypress", function (e) {
    if (e.key === "Enter") {
      handleSubmit();
    }
  });

  // Set up drag and drop functionality
  setupDragAndDrop();
}

function setupDragAndDrop() {
  // File input change handler
  fileInput.elt.addEventListener('change', handleFileSelect);

  // Drag and drop events for input container
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
    // Reset conversation history when image is cleared
    conversationHistory = [];
  });
  return clearBtn;
}

function processImage(file) {
  const reader = new FileReader();

  reader.onload = function (e) {
    currentImageBase64 = e.target.result.split(',')[1];

    // Clear previous preview
    previewContainer.elt.innerHTML = '';

    // Create preview image
    const img = createElement('img');
    img.elt.src = e.target.result;
    img.parent(previewContainer);

    // Add clear button
    const clearBtn = createClearImageButton();
    clearBtn.parent(previewContainer);

    // Reset conversation history when new image is uploaded
    conversationHistory = [];
  };

  reader.readAsDataURL(file);
}

function addMessageToChat(message, isUser) {
  let messageDiv = createDiv("");
  messageDiv.parent(chatContainer);
  messageDiv.class("message");
  messageDiv.addClass(isUser ? "user-message" : "bot-message");

  messageDiv.html(`
    <div class="message-header">
      <strong>${isUser ? "You" : "Assistant"}</strong>
    </div>
    <div class="message-content">
      ${message}
    </div>
  `);

  chatContainer.elt.scrollTop = chatContainer.elt.scrollHeight;
  return messageDiv;
}

async function handleSubmit() {
  const inputValue = inputField.elt.value;
  if (!inputValue && !currentImageBase64) return;

  inputField.elt.value = "";

  addMessageToChat(inputValue, true);

  // Add user message to conversation history
  conversationHistory.push({
    role: "user",
    content: inputValue,
    ...(currentImageBase64 && { images: [currentImageBase64] })
  });

  document.body.style.cursor = "progress";
  submitButton.elt.disabled = true;

  const loadingMessage = addMessageToChat("Processing your request...", false);

  try {
    const response = await getChatResponse(inputValue);
    loadingMessage.remove();
    addMessageToChat(response, false);

    // Add assistant response to conversation history
    conversationHistory.push({
      role: "assistant",
      content: response
    });

    chatHistory.push({
      prompt: inputValue,
      response: response,
    });

  } catch (error) {
    console.error("Error:", error);
    loadingMessage.remove();
    addMessageToChat("Sorry, there was an error processing your request.", false);
  }

  document.body.style.cursor = "default";
  submitButton.elt.disabled = false;
}

async function getChatResponse(userMessage) {
  // Prepare messages array with system prompt
  const messages = [
    {
      role: "system",
      content: systemPrompt
    },
    ...conversationHistory
  ];

  const data = {
    model: "llama3.2-vision",
    messages: messages,
    stream: false,
  };

  const response = await fetch('http://localhost:11434/api/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const result = await response.json();
  return result.message.content;
}