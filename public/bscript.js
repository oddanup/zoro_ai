document.addEventListener("DOMContentLoaded", () => {
  // =========================
  // HELPERS (safe storage)
  // =========================
  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function save(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error("Could not save:", error);
    }
  }

  // =========================
  // SETTINGS (saved choices)
  // =========================
  let settings = {
    enterToSend: load("zoro-enter-to-send", true), // old key, kept so nothing is lost
    voiceLang: "en-US",
    timeFormat: "12", // "12" or "24"
    tempUnit: "C", // "C" or "F"
    typingGreeting: true,
    theme: "dark", // "dark", "light" or "system"
    accent: "purple", // "purple", "blue", "pink" or "green"
    ...load("zoro-settings", {}),
  };

  function saveSettings() {
    save("zoro-settings", settings);
  }

  // Applies the chosen theme (dark / light / system) and accent color
  const systemLight = window.matchMedia("(prefers-color-scheme: light)");

  function applyTheme() {
    const mode =
      settings.theme === "system"
        ? systemLight.matches
          ? "light"
          : "dark"
        : settings.theme;

    document.documentElement.dataset.theme = mode;
    document.documentElement.dataset.accent = settings.accent;
  }

  applyTheme();
  systemLight.addEventListener("change", () => {
    if (settings.theme === "system") applyTheme();
  });

  // =========================
  // PROFILE / USER NAME
  // =========================
  let profile = load("zoro-profile", null) || { name: "Anup", email: "" };

  function userName() {
    return profile.name || "Anup";
  }

  // =========================
  // GREETING
  // =========================
  const greeting = document.getElementById("time_greeting");

  function updateGreeting() {
    const hour = new Date().getHours();
    let message;

    if (hour < 12) message = "Good Morning";
    else if (hour < 18) message = "Good Afternoon";
    else message = "Good Evening";

    greeting.textContent = `${message}, ${userName()} 👋`;
  }

  // =========================
  // TIME AND DATE
  // =========================
  const currentTime = document.getElementById("current-time");
  const currentDate = document.getElementById("current-date");

  function updateDateTime() {
    const now = new Date();

    currentTime.textContent = now.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hourCycle: settings.timeFormat === "24" ? "h23" : "h12",
    });

    currentDate.textContent = now.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  }

  updateGreeting();
  updateDateTime();
  setInterval(updateGreeting, 60000);
  setInterval(updateDateTime, 1000);

  // =========================
  // TYPING GREETING TEXT
  // =========================
  const greetingText = document.getElementById("greeding-text");

  const messages = [
    "What can I help you with today?",
    "How can I assist you today?",
    "What would you like to do today?",
    "What are we working on today?",
    "How can Zoro help you today?",
  ];

  let messageIndex = 0;
  let typeTimer = null;

  function typeMessage() {
    clearTimeout(typeTimer);

    if (!settings.typingGreeting) {
      greetingText.textContent = messages[messageIndex];
      return;
    }

    greetingText.textContent = "";

    const message = messages[messageIndex];
    let index = 0;

    function type() {
      if (index < message.length) {
        greetingText.textContent += message[index];
        index++;
        typeTimer = setTimeout(type, 60);
      }
    }

    type();
  }

  typeMessage();

  setInterval(() => {
    messageIndex = (messageIndex + 1) % messages.length;
    typeMessage();
  }, 6000);

  // =========================
  // WEATHER
  // =========================
  const temperature = document.getElementById("temperature");
  const weatherCondition = document.getElementById("weather-condition");
  const weatherLocation = document.getElementById("weather-location");
  const feelsLike = document.getElementById("feels-like");
  const humidity = document.getElementById("humidity");
  const weatherIcon = document.getElementById("weather-icon");
  const tempUnitLabel = document.getElementById("temp-unit");

  // last values from the weather API, always in Celsius
  let lastWeather = null;

  function renderTemps() {
    if (!lastWeather) return;

    const useF = settings.tempUnit === "F";
    const convert = (c) => Math.round(useF ? (c * 9) / 5 + 32 : c);

    temperature.textContent = convert(lastWeather.temp);
    feelsLike.textContent = `${convert(lastWeather.feels)}°${useF ? "F" : "C"}`;
    tempUnitLabel.textContent = useF ? "F" : "C";
  }

  function getWeatherInfo(code, isDay) {
    if (code === 0)
      return { icon: isDay ? "☀️" : "🌙", condition: "Clear Sky" };
    if (code === 1)
      return { icon: isDay ? "🌤️" : "🌙", condition: "Mainly Clear" };
    if (code === 2)
      return { icon: isDay ? "⛅" : "☁️", condition: "Partly Cloudy" };
    if (code === 3) return { icon: "☁️", condition: "Cloudy" };
    if (code === 45 || code === 48) return { icon: "🌫️", condition: "Foggy" };
    if (code >= 51 && code <= 57) return { icon: "🌦️", condition: "Drizzle" };
    if (code >= 61 && code <= 67) return { icon: "🌧️", condition: "Rain" };
    if (code >= 71 && code <= 77) return { icon: "🌨️", condition: "Snow" };
    if (code >= 80 && code <= 82)
      return { icon: "🌧️", condition: "Rain Showers" };
    if (code >= 85 && code <= 86)
      return { icon: "🌨️", condition: "Snow Showers" };
    if (code >= 95 && code <= 99)
      return { icon: "⛈️", condition: "Thunderstorm" };
    return { icon: isDay ? "🌤️" : "🌙", condition: "Unknown" };
  }

  async function getWeather(weatherURL) {
    try {
      const response = await fetch(weatherURL);
      const data = await response.json();

      const info = getWeatherInfo(
        data.current.weather_code,
        data.current.is_day === 1,
      );

      weatherIcon.textContent = info.icon;
      weatherCondition.textContent = info.condition;
      lastWeather = {
        temp: data.current.temperature_2m,
        feels: data.current.apparent_temperature,
      };
      renderTemps();
      humidity.textContent = `${data.current.relative_humidity_2m}%`;
    } catch (error) {
      console.error("Weather error:", error);
      weatherCondition.textContent = "Unable to get weather";
    }
  }

  // Looks up the city name from coordinates (free, no API key)
  async function getPlaceName(latitude, longitude) {
    try {
      const url = `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${latitude}&longitude=${longitude}&localityLanguage=en`;
      const response = await fetch(url);
      const data = await response.json();

      const city = data.city || data.locality || data.principalSubdivision;
      weatherLocation.textContent = city
        ? `${city}, ${data.countryName}`
        : "Your location";
    } catch (error) {
      console.error("Place error:", error);
      weatherLocation.textContent = "Your location";
    }
  }

  function loadWeather() {
    if (!navigator.geolocation) {
      weatherCondition.textContent = "Location not supported";
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;

        const weatherURL = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day`;

        getWeather(weatherURL);
        getPlaceName(latitude, longitude);
      },
      (error) => {
        console.error("Location error:", error);
        weatherCondition.textContent = "Location unavailable";
        weatherLocation.textContent = "Allow location access";
      },
    );
  }

  loadWeather();
  setInterval(loadWeather, 5 * 60000); // every 5 minutes

  // =========================
  // MOOD
  // =========================
  const moodEmoji = document.getElementById("mood-emoji");
  const moodName = document.getElementById("mood-name");
  const moodDescription = document.getElementById("mood-description");
  const moodStatus = document.getElementById("mood-status");

  const moods = [
    {
      emoji: "😄",
      name: "Great",
      description: "Feeling amazing today",
      status: "Your mood today",
    },
    {
      emoji: "😊",
      name: "Good",
      description: "Feeling positive today",
      status: "Your mood today",
    },
    {
      emoji: "😐",
      name: "Okay",
      description: "Feeling normal today",
      status: "Your mood today",
    },
    {
      emoji: "😔",
      name: "Low",
      description: "Feeling a little down",
      status: "Your mood today",
    },
    {
      emoji: "😡",
      name: "Angry",
      description: "Feeling frustrated today",
      status: "Your mood today",
    },
  ];

  let moodIndex = 0;

  function showMood() {
    const mood = moods[moodIndex];

    moodEmoji.textContent = mood.emoji;
    moodName.textContent = mood.name;
    moodDescription.textContent = mood.description;
    moodStatus.textContent = mood.status;

    moodIndex = (moodIndex + 1) % moods.length;
  }

  showMood(); // show immediately, not after 3 seconds
  setInterval(showMood, 3000);

  // =========================
  // TASKS
  // =========================
  const addTaskBtn = document.getElementById("add-task-btn");
  const todoList = document.getElementById("todo-list");
  const completedList = document.getElementById("completed-list");

  const taskModal = document.getElementById("task-modal");
  const taskInput = document.getElementById("task-input");
  const saveTaskBtn = document.getElementById("save-task");
  const cancelTaskBtn = document.getElementById("cancel-task");
  const closeTaskModalBtn = document.getElementById("close-task-modal");

  // each task: { text, done }
  let tasks = load("zoro-tasks", []);

  function renderTasks() {
    todoList.replaceChildren();
    completedList.replaceChildren();

    tasks.forEach((task, i) => {
      const row = document.createElement("div");
      row.className = "flex items-center gap-3";

      const mark = document.createElement("span");
      const label = document.createElement("p");
      label.textContent = task.text; // textContent = safe from script injection

      if (task.done) {
        mark.className = "text-[color:var(--c-ok)]";
        mark.textContent = "✓";
        label.className = "text-[color:var(--c-faint)] line-through";
        completedList.appendChild(row);
      } else {
        mark.className =
          "task-check cursor-pointer text-[color:var(--c-faint)] hover:text-[color:var(--c-accent)]";
        mark.textContent = "○";
        mark.addEventListener("click", () => {
          tasks[i].done = true;
          save("zoro-tasks", tasks);
          renderTasks();
        });
        todoList.appendChild(row);
      }

      row.append(mark, label);
    });

    if (!todoList.children.length) {
      todoList.innerHTML =
        '<p class="text-sm text-[color:var(--c-faint)]">Nothing to do. Add a task with +</p>';
    }
    if (!completedList.children.length) {
      completedList.innerHTML =
        '<p class="text-sm text-[color:var(--c-faint)]">No completed tasks yet</p>';
    }
  }

  function openTaskModal() {
    taskModal.classList.remove("hidden");
    taskModal.classList.add("flex");
    taskInput.focus();
  }

  function closeTaskModal() {
    taskModal.classList.add("hidden");
    taskModal.classList.remove("flex");
    taskInput.value = "";
  }

  addTaskBtn.addEventListener("click", openTaskModal);
  cancelTaskBtn.addEventListener("click", closeTaskModal);
  closeTaskModalBtn.addEventListener("click", closeTaskModal);

  saveTaskBtn.addEventListener("click", () => {
    const text = taskInput.value.trim();
    if (!text) return;

    tasks.unshift({ text, done: false });
    save("zoro-tasks", tasks);
    renderTasks();
    closeTaskModal();
  });

  taskInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") saveTaskBtn.click();
  });

  renderTasks();

  // =========================
  // NOTES
  // =========================
  const addNoteBtn = document.getElementById("add-note-btn");
  const notesList = document.getElementById("notes-list");

  const noteModal = document.getElementById("note-modal");
  const noteTitle = document.getElementById("note-title");
  const noteDescription = document.getElementById("note-description");

  const saveNoteBtn = document.getElementById("save-note");
  const cancelNoteBtn = document.getElementById("cancel-note");
  const closeNoteModalBtn = document.getElementById("close-note-modal");

  // each note: { title, description }
  let notes = load("zoro-notes", []);

  function renderNotes() {
    notesList.replaceChildren();

    if (!notes.length) {
      const empty = document.createElement("p");
      empty.className = "text-sm text-[color:var(--c-faint)]";
      empty.textContent = "No notes yet. Add one with +";
      notesList.appendChild(empty);
      return;
    }

    notes.forEach((note, i) => {
      const card = document.createElement("div");
      card.className = "rounded-xl bg-[color:var(--c-raised)] p-4";

      const wrap = document.createElement("div");
      wrap.className = "flex items-start justify-between gap-3";

      const text = document.createElement("div");
      const title = document.createElement("p");
      title.className = "font-medium";
      title.textContent = note.title;

      const body = document.createElement("p");
      body.className = "mt-1 text-sm text-[color:var(--c-muted)]";
      body.textContent = note.description;

      text.append(title, body);

      const del = document.createElement("button");
      del.className =
        "shrink-0 text-[color:var(--c-faint)] hover:text-[color:var(--c-danger)]";
      del.textContent = "✕";
      del.setAttribute("aria-label", "Delete note");
      del.addEventListener("click", () => {
        notes.splice(i, 1);
        save("zoro-notes", notes);
        renderNotes();
      });

      wrap.append(text, del);
      card.appendChild(wrap);
      notesList.appendChild(card);
    });
  }

  function closeNoteModal() {
    noteModal.classList.add("hidden");
    noteModal.classList.remove("flex");
    noteTitle.value = "";
    noteDescription.value = "";
  }

  addNoteBtn.addEventListener("click", () => {
    noteModal.classList.remove("hidden");
    noteModal.classList.add("flex");
    noteTitle.focus();
  });

  cancelNoteBtn.addEventListener("click", closeNoteModal);
  closeNoteModalBtn.addEventListener("click", closeNoteModal);

  saveNoteBtn.addEventListener("click", () => {
    const title = noteTitle.value.trim();
    const description = noteDescription.value.trim();
    if (!title || !description) return;

    notes.unshift({ title, description });
    save("zoro-notes", notes);
    renderNotes();
    closeNoteModal();
  });

  renderNotes();

  // Close modals with Escape
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeTaskModal();
      closeNoteModal();
    }
  });

  // =========================
  // PAGE NAVIGATION
  // =========================
  const navLinks = document.querySelectorAll("[data-nav]");
  const pageViews = document.querySelectorAll("[data-view]");

  function showPage(pageName) {
    pageViews.forEach((page) => {
      const selected = page.dataset.view === pageName;

      page.classList.toggle("hidden", !selected);

      // chat uses flex layout when visible
      if (page.dataset.view === "chat") {
        page.classList.toggle("flex", selected);
      }
    });

    navLinks.forEach((link) => {
      const active = link.dataset.nav === pageName;

      link.classList.toggle("bg-[color:var(--c-accent)]", active);
      link.classList.toggle("text-white", active);
      link.classList.toggle("text-[color:var(--c-muted)]", !active);
    });

    if (pageName === "history") renderHistory();
    if (pageName === "profile") renderProfile();

    if (pageName === "chat") {
      chatMessages.scrollTop = chatMessages.scrollHeight;
      chatInput.focus();
    }
  }

  navLinks.forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      showPage(link.dataset.nav);
    });
  });

  // =========================
  // CHAT
  // =========================
  const chatForm = document.getElementById("chat-form");
  const chatInput = document.getElementById("chat-input");
  const chatMessages = document.getElementById("chat-messages");
  const enterToSend = document.getElementById("enter-to-send");
  const chatEmpty = document.getElementById("chat-empty");
  const chatStatus = document.getElementById("chat-status");
  const newChatBtn = document.getElementById("new-chat-btn");

  // Every chat is saved as its own conversation:
  // { id, title, createdAt, updatedAt, messages: [{ text, isUser, time }] }
  let conversations = load("zoro-convos", null);
  let currentId = load("zoro-current", null);

  function newId() {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function makeTitle(text) {
    const clean = (text || "").replace(/\s+/g, " ").trim();
    if (!clean) return "New chat";
    return clean.length > 40 ? clean.slice(0, 40).trimEnd() + "…" : clean;
  }

  function persist() {
    save("zoro-convos", conversations);
    save("zoro-current", currentId);
  }

  function getConvo(id) {
    return conversations.find((c) => c.id === id);
  }

  function startConvo() {
    const now = Date.now();
    const convo = {
      id: newId(),
      title: "New chat",
      createdAt: now,
      updatedAt: now,
      messages: [],
    };
    conversations.unshift(convo);
    currentId = convo.id;
    persist();
    return convo;
  }

  // First run after this update: move the old single chat into History
  if (conversations === null) {
    const old = load("zoro-chat", []);
    conversations = [];

    if (old.length) {
      const firstUser = old.find((m) => m.isUser) || old[0];
      conversations.push({
        id: newId(),
        title: makeTitle(firstUser.text),
        createdAt: old[0].time || Date.now(),
        updatedAt: old[old.length - 1].time || Date.now(),
        messages: old,
      });
      currentId = conversations[0].id;
    }
    persist();
  }

  // Show the "What can I help with?" screen only when there are no messages
  function updateEmptyState() {
    const hasMessages = chatMessages.children.length > 0;
    chatEmpty.classList.toggle("hidden", hasMessages);
    chatMessages.classList.toggle("hidden", !hasMessages);
  }

  // Header badge: "Ready" or "Thinking..."
  function setStatus(thinking) {
    chatStatus.textContent = thinking ? "Thinking..." : "Ready";
    chatStatus.classList.toggle("bg-[color:var(--c-ok-bg)]", !thinking);
    chatStatus.classList.toggle("text-[color:var(--c-ok)]", !thinking);
    chatStatus.classList.toggle("bg-[color:var(--c-think-bg)]", thinking);
    chatStatus.classList.toggle("text-[color:var(--c-accent-text)]", thinking);
  }

  // remember the "Enter to send" setting
  enterToSend.checked = settings.enterToSend;
  enterToSend.addEventListener("change", () => {
    settings.enterToSend = enterToSend.checked;
    saveSettings();
  });

  function drawMessage(message, isUser) {
    const row = document.createElement("div");
    row.className = isUser ? "flex justify-end" : "flex items-start gap-3";

    const bubble = document.createElement("div");
    bubble.className = isUser
      ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[color:var(--c-accent)] p-4 text-sm leading-6"
      : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-[color:var(--c-raised)] p-4 text-sm leading-6";
    bubble.textContent = message;

    if (isUser) {
      row.appendChild(bubble);
    } else {
      const logo = document.createElement("div");
      logo.className =
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color:var(--c-raised)] text-[color:var(--c-accent)]";
      logo.textContent = "乙";
      row.append(logo, bubble);
    }

    chatMessages.appendChild(row);
    updateEmptyState(); // must run before scrolling so the list is visible
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Return these elements so sendMessage() can update the live reply bubble.
    return { row, bubble };
  }

  function addChatMessage(convo, message, isUser) {
    if (!conversations.includes(convo)) return; // chat was deleted while Zoro was replying

    convo.messages.push({ text: message, isUser, time: Date.now() });
    if (isUser && convo.title === "New chat") convo.title = makeTitle(message);
    convo.updatedAt = Date.now();
    persist();

    if (convo.id === currentId) drawMessage(message, isUser);
  }

  // Draws the open conversation (or the empty "What can I help with?" screen)
  function renderChat() {
    chatMessages.replaceChildren();

    const convo = getConvo(currentId);
    if (convo) convo.messages.forEach((m) => drawMessage(m.text, m.isUser));

    updateEmptyState();
  }

  function openConversation(id) {
    currentId = id;
    persist();
    renderChat();
    showPage("chat");
  }

  function newChat() {
    currentId = null;
    persist();
    renderChat();
    setStatus(false);
  }

  // Replace this with a real API call later (through your own backend)

  // ----- talking to the AI (through your own server) -----
  let busy = false; // true while Zoro is replying

  async function sendMessage(message) {
    console.log("ZORO DEBUG: sendMessage called", message);

    if (busy) return;
    const convo = getConvo(currentId) || startConvo();
    addChatMessage(convo, message, true);

    // last 30 messages go to the AI, and the list must start with a user message
    const history = convo.messages
      .map((m) => ({ role: m.isUser ? "user" : "assistant", content: m.text }))
      .slice(-30);
    while (history.length && history[0].role !== "user") history.shift();

    busy = true;
    setStatus(true);

    // live bubble that fills in as the reply streams
    const live = convo.id === currentId ? drawMessage("…", false) : null;
    let reply = "";

    try {
      console.log("ZORO DEBUG: sending request to /api/chat");
      console.log("Chat history:", history);
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error("ZORO SERVER RESPONSE:", errorText);
        throw new Error(
          `Server error (${response.status}): ${errorText || "Empty response"}`,
        );
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        reply += decoder.decode(value, { stream: true });
        if (live) {
          live.bubble.textContent = reply;
          chatMessages.scrollTop = chatMessages.scrollHeight;
        }
      }

      if (!reply.trim()) throw new Error("Zoro sent an empty reply.");

      // swap the live bubble for the saved message
      if (live) live.row.remove();
      addChatMessage(convo, reply, false);
    } catch (error) {
      console.error("Chat error:", error);

      if (reply.trim()) {
        // connection dropped mid-reply: keep what arrived
        if (live) live.row.remove();
        addChatMessage(convo, reply, false);
      } else if (live) {
        // show the error but do not save it into the chat
        live.bubble.textContent = error.message;
        live.bubble.classList.add("text-[color:var(--c-danger)]");
      }
    } finally {
      busy = false;
      setStatus(false);
    }
  }

  // "+" button starts a new chat (the old one stays in History)
  newChatBtn.addEventListener("click", () => {
    newChat();
    chatInput.focus();
  });

  // Clicking a suggestion card sends its message straight away
  document.querySelectorAll(".suggestion").forEach((card) => {
    card.addEventListener("click", () => {
      sendMessage(card.dataset.prompt);
    });
  });

  chatForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const message = chatInput.value.trim();
    if (!message || busy) return;

    chatInput.value = "";
    chatInput.style.height = "auto";
    sendMessage(message);
  });

  chatInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey && enterToSend.checked) {
      event.preventDefault();
      chatForm.requestSubmit();
    }
  });

  // Auto-grow the chat textarea
  chatInput.addEventListener("input", () => {
    chatInput.style.height = "auto";
    chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + "px";
  });

  // Draw saved messages (or show the empty state the first time)
  renderChat();

  // =========================
  // ASK ZORO (dashboard box)
  // =========================
  const zoroInput = document.getElementById("zoro-input");
  const zoroSend = document.getElementById("zoro-send");
  const voiceBtn = document.getElementById("voice-btn");
  const maxHeight = 160;

  zoroInput.addEventListener("input", () => {
    zoroInput.style.height = "auto";

    if (zoroInput.scrollHeight <= maxHeight) {
      zoroInput.style.height = zoroInput.scrollHeight + "px";
      zoroInput.style.overflowY = "hidden";
    } else {
      zoroInput.style.height = maxHeight + "px";
      zoroInput.style.overflowY = "auto";
    }
  });

  // Sends the dashboard message to the chat page
  function askZoro() {
    const message = zoroInput.value.trim();
    if (!message) return;

    zoroInput.value = "";
    zoroInput.style.height = "auto";

    newChat(); // a question from Home starts a fresh chat
    showPage("chat");
    sendMessage(message);
  }

  zoroSend.addEventListener("click", askZoro);

  zoroInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      askZoro();
    }
  });

  // Voice input (browser speech recognition, works in Chrome/Edge)
  const SpeechRecognition =
    window.SpeechRecognition || window.webkitSpeechRecognition;

  if (SpeechRecognition) {
    const recognition = new SpeechRecognition();
    recognition.lang = "en-US";
    recognition.interimResults = false;

    recognition.addEventListener("result", (event) => {
      zoroInput.value = event.results[0][0].transcript;
      zoroInput.focus();
    });

    recognition.addEventListener("end", () => {
      voiceBtn.classList.remove(
        "bg-[color:var(--c-raised)]",
        "text-[color:var(--c-accent)]",
      );
    });

    voiceBtn.addEventListener("click", () => {
      voiceBtn.classList.add(
        "bg-[color:var(--c-raised)]",
        "text-[color:var(--c-accent)]",
      );
      recognition.lang = settings.voiceLang;
      recognition.start();
    });
  } else {
    voiceBtn.title = "Voice input is not supported in this browser";
    voiceBtn.classList.add("opacity-40");
  }

  // =========================
  // HISTORY PAGE
  // =========================
  const historyList = document.getElementById("history-list");
  const historySearch = document.getElementById("history-search");

  const GROUPS = ["Today", "Yesterday", "Previous 7 days", "Older"];

  function groupOf(time) {
    const now = new Date();
    const startToday = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
    ).getTime();
    const day = 24 * 60 * 60 * 1000;

    if (time >= startToday) return "Today";
    if (time >= startToday - day) return "Yesterday";
    if (time >= startToday - 6 * day) return "Previous 7 days";
    return "Older";
  }

  function historyTime(time, group) {
    const options =
      group === "Today"
        ? { hour: "numeric", minute: "2-digit" }
        : {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          };

    options.hourCycle = settings.timeFormat === "24" ? "h23" : "h12";
    return new Date(time).toLocaleString("en-US", options);
  }

  function historyMessage(text, classes) {
    const box = document.createElement("p");
    box.className = classes;
    box.textContent = text;
    return box;
  }

  function renderHistoryEmpty() {
    const box = document.createElement("div");
    box.className =
      "flex flex-col items-center rounded-2xl border border-dashed border-[color:var(--c-border)] px-6 py-14 text-center";

    const icon = document.createElement("div");
    icon.className =
      "flex h-14 w-14 items-center justify-center rounded-2xl border border-[color:var(--c-border-strong)] bg-[color:var(--c-raised)] text-2xl text-[color:var(--c-accent)]";
    icon.textContent = "乙";

    const title = historyMessage("No chats yet", "mt-5 font-semibold");
    const text = historyMessage(
      "Your conversations with Zoro will show up here.",
      "mt-2 text-sm text-[color:var(--c-muted)]",
    );

    const button = document.createElement("button");
    button.type = "button";
    button.className =
      "mt-6 rounded-xl bg-[color:var(--c-accent)] px-4 py-2 text-sm font-medium hover:bg-[color:var(--c-accent-hover)]";
    button.textContent = "Start a chat";
    button.addEventListener("click", () => {
      newChat();
      showPage("chat");
    });

    box.append(icon, title, text, button);
    historyList.appendChild(box);
  }

  function renderHistoryItem(convo, group) {
    const row = document.createElement("div");
    row.className = "flex items-stretch gap-2";

    const isCurrent = convo.id === currentId;

    const open = document.createElement("button");
    open.type = "button";
    open.className = isCurrent
      ? "min-w-0 flex-1 rounded-xl border border-[color:var(--c-accent)]/50 bg-[color:var(--c-surface)] p-4 text-left transition-colors hover:border-[color:var(--c-accent)]"
      : "min-w-0 flex-1 rounded-xl border border-[color:var(--c-border)] bg-[color:var(--c-surface)] p-4 text-left transition-colors hover:border-[color:var(--c-accent)]/50";

    const last = convo.messages[convo.messages.length - 1];
    const count = convo.messages.length;

    open.append(
      historyMessage(convo.title, "truncate text-sm font-medium"),
      historyMessage(
        last ? last.text : "",
        "mt-1 truncate text-xs text-[color:var(--c-muted)]",
      ),
      historyMessage(
        `${historyTime(convo.updatedAt, group)}, ${count} ${count === 1 ? "message" : "messages"}`,
        "mt-2 text-xs text-[color:var(--c-faint)]",
      ),
    );
    open.addEventListener("click", () => openConversation(convo.id));

    const del = document.createElement("button");
    del.type = "button";
    del.setAttribute("aria-label", "Delete chat");
    del.title = "Delete chat";
    del.className =
      "shrink-0 rounded-xl border border-[color:var(--c-border)] bg-[color:var(--c-surface)] px-4 text-[color:var(--c-faint)] transition-colors hover:border-red-400/60 hover:text-[color:var(--c-danger)]";
    del.textContent = "✕";
    del.addEventListener("click", () => {
      if (!confirm(`Delete "${convo.title}"?`)) return;

      conversations = conversations.filter((c) => c.id !== convo.id);
      if (currentId === convo.id) currentId = null;
      persist();

      renderChat();
      renderHistory();
      renderProfile();
    });

    row.append(open, del);
    return row;
  }

  function renderHistory() {
    historyList.replaceChildren();

    if (!conversations.length) {
      renderHistoryEmpty();
      return;
    }

    const query = historySearch.value.trim().toLowerCase();

    const matches = [...conversations]
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .filter(
        (c) =>
          !query ||
          c.title.toLowerCase().includes(query) ||
          c.messages.some((m) => m.text.toLowerCase().includes(query)),
      );

    if (!matches.length) {
      historyList.appendChild(
        historyMessage(
          `No chats match "${historySearch.value.trim()}".`,
          "text-sm text-[color:var(--c-muted)]",
        ),
      );
      return;
    }

    GROUPS.forEach((group) => {
      const items = matches.filter((c) => groupOf(c.updatedAt) === group);
      if (!items.length) return;

      const section = document.createElement("div");
      section.className = "space-y-3";
      section.appendChild(
        historyMessage(
          group,
          "text-sm font-semibold text-[color:var(--c-muted)]",
        ),
      );
      items.forEach((convo) =>
        section.appendChild(renderHistoryItem(convo, group)),
      );

      historyList.appendChild(section);
    });
  }

  historySearch.addEventListener("input", renderHistory);

  // =========================
  // PROFILE & ACCOUNT
  // =========================
  // To turn on real sign-in, paste your keys here:
  //  - Google: Client ID from Google Cloud Console (OAuth client, type "Web")
  //  - Facebook: App ID from developers.facebook.com
  const GOOGLE_CLIENT_ID = "";
  const FACEBOOK_APP_ID = "";

  let auth = load("zoro-auth", null); // { provider, name, email, picture }

  const profileForm = document.getElementById("profile-form");
  const profileStatus = document.getElementById("profile-status");
  const profileName = document.getElementById("profile-name");
  const profileEmail = document.getElementById("profile-email");
  const profileLocation = document.getElementById("profile-location");
  const profileBio = document.getElementById("profile-bio");

  const avatarEl = document.getElementById("profile-avatar");
  const authStatus = document.getElementById("auth-status");
  const authSignedOut = document.getElementById("auth-signed-out");
  const authSignedIn = document.getElementById("auth-signed-in");
  const authDescription = document.getElementById("auth-description");

  function setAvatar(name, picture) {
    const initial = (name || "?").trim().charAt(0).toUpperCase() || "?";
    avatarEl.replaceChildren();

    if (
      picture &&
      (picture.startsWith("https://") || picture.startsWith("data:image/"))
    ) {
      const img = document.createElement("img");
      img.alt = "";
      img.referrerPolicy = "no-referrer";
      img.className = "h-full w-full object-cover";
      img.addEventListener("error", () => {
        avatarEl.replaceChildren();
        avatarEl.textContent = initial;
      });
      img.src = picture;
      avatarEl.appendChild(img);
    } else {
      avatarEl.textContent = initial;
    }
  }

  function fillForm() {
    profileName.value = profile.name || "";
    profileEmail.value = profile.email || "";
    profileLocation.value = profile.location || "";
    profileBio.value = profile.bio || "";
  }

  function renderProfile() {
    document.getElementById("profile-display-name").textContent = userName();
    document.getElementById("profile-display-email").textContent =
      profile.email || "No email added yet";
    document.getElementById("profile-display-bio").textContent =
      profile.bio || "";

    setAvatar(userName(), profile.photo || (auth && auth.picture));
    document
      .getElementById("photo-remove")
      .classList.toggle("hidden", !profile.photo);

    document.getElementById("profile-badge").textContent = auth
      ? `Signed in with ${auth.provider}`
      : "Guest";

    // stats
    const doneTasks = tasks.filter((t) => t.done).length;
    document.getElementById("stat-chats").textContent = conversations.length;
    document.getElementById("stat-tasks").textContent =
      `${doneTasks}/${tasks.length}`;
    document.getElementById("stat-notes").textContent = notes.length;

    // account panel
    authSignedOut.classList.toggle("hidden", !!auth);
    authSignedIn.classList.toggle("hidden", !auth);
    authDescription.textContent = auth
      ? `You're signed in with ${auth.provider}.`
      : "Sign in to link Zoro to your account.";
    renderSettingsAccount();
  }

  // keeps the Account card in Settings in sync with the profile page
  function renderSettingsAccount() {
    const name = auth ? userName() : "Guest";

    document.getElementById("settings-avatar").textContent = name
      .charAt(0)
      .toUpperCase();
    document.getElementById("settings-account-name").textContent = name;
    document.getElementById("settings-account-detail").textContent = auth
      ? profile.email || `Signed in with ${auth.provider}`
      : "You're not signed in";

    document
      .getElementById("settings-logout")
      .classList.toggle("hidden", !auth);
    document
      .getElementById("settings-go-profile")
      .classList.toggle("hidden", !!auth);
  }

  fillForm();
  renderProfile();

  profileForm.addEventListener("submit", (event) => {
    event.preventDefault();

    const name = profileName.value.trim();
    if (!name) {
      profileStatus.textContent = "Please enter a display name.";
      return;
    }

    profile = {
      ...profile,
      name,
      email: profileEmail.value.trim(),
      location: profileLocation.value.trim(),
      bio: profileBio.value.trim(),
    };
    save("zoro-profile", profile);
    updateGreeting();
    renderProfile();
    profileStatus.textContent = "Saved on this browser.";
  });

  // ----- profile photo upload -----
  const photoBtn = document.getElementById("photo-btn");
  const photoRemove = document.getElementById("photo-remove");
  const photoInput = document.getElementById("photo-input");
  const photoStatus = document.getElementById("photo-status");

  // Crops to a centered square and shrinks to 256px so it stays small in storage
  function resizeImage(file, size = 256) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onerror = reject;
      reader.onload = () => {
        const img = new Image();
        img.onerror = reject;
        img.onload = () => {
          const side = Math.min(img.width, img.height);
          const sx = (img.width - side) / 2;
          const sy = (img.height - side) / 2;

          const canvas = document.createElement("canvas");
          canvas.width = size;
          canvas.height = size;
          canvas
            .getContext("2d")
            .drawImage(img, sx, sy, side, side, 0, 0, size, size);
          resolve(canvas.toDataURL("image/jpeg", 0.85));
        };
        img.src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  photoBtn.addEventListener("click", () => photoInput.click());
  avatarEl.addEventListener("click", () => photoInput.click());

  photoInput.addEventListener("change", async () => {
    const file = photoInput.files[0];
    photoInput.value = ""; // lets you pick the same file again later
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      photoStatus.textContent = "Please choose an image file.";
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      photoStatus.textContent =
        "That image is too large. Choose one under 10 MB.";
      return;
    }

    try {
      profile = { ...profile, photo: await resizeImage(file) };
      save("zoro-profile", profile);
      renderProfile();
      photoStatus.textContent = "Photo updated.";
    } catch (error) {
      console.error("Photo error:", error);
      photoStatus.textContent =
        "Could not read that image. Try a different one.";
    }
  });

  photoRemove.addEventListener("click", () => {
    profile = { ...profile, photo: "" };
    save("zoro-profile", profile);
    renderProfile();
    photoStatus.textContent = "Photo removed.";
  });

  // ----- sign in / log out -----
  function signIn(provider, data) {
    auth = {
      provider,
      name: data.name || "",
      email: data.email || "",
      picture: data.picture || "",
    };
    save("zoro-auth", auth);

    profile = {
      ...profile,
      name: data.name || profile.name,
      email: data.email || profile.email,
    };
    save("zoro-profile", profile);

    fillForm();
    updateGreeting();
    renderProfile();
    authStatus.textContent = `Welcome, ${userName()}!`;
  }

  function logOut() {
    if (!confirm("Log out of Zoro?")) return;

    try {
      if (window.google && google.accounts)
        google.accounts.id.disableAutoSelect();
      if (window.FB) FB.logout(() => {});
    } catch (error) {
      console.error("Logout error:", error);
    }

    auth = null;
    try {
      localStorage.removeItem("zoro-auth");
    } catch {}

    profile = { name: "Anup", email: "", location: "", bio: "" };
    save("zoro-profile", profile);

    fillForm();
    updateGreeting();
    renderProfile();
    authStatus.textContent = "You've been logged out.";
  }

  document.getElementById("logout-btn").addEventListener("click", logOut);

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.onload = resolve;
      script.onerror = reject;
      document.head.appendChild(script);
    });
  }

  // Google sends back a signed token; we only read the name, email and picture from it
  function decodeJwt(token) {
    const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(payload)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json);
  }

  // ----- Google -----
  const googleBtn = document.getElementById("google-btn");

  googleBtn.addEventListener("click", () => {
    authStatus.textContent =
      "Google sign-in isn't set up yet. Add your GOOGLE_CLIENT_ID in script.js.";
  });

  if (GOOGLE_CLIENT_ID) {
    loadScript("https://accounts.google.com/gsi/client")
      .then(() => {
        google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => {
            const user = decodeJwt(response.credential);
            signIn("Google", {
              name: user.name,
              email: user.email,
              picture: user.picture,
            });
          },
        });
        googleBtn.classList.add("hidden");
        google.accounts.id.renderButton(
          document.getElementById("google-slot"),
          {
            theme: "filled_black",
            size: "large",
            text: "continue_with",
            shape: "rectangular",
          },
        );
      })
      .catch(() => {
        authStatus.textContent =
          "Could not load Google sign-in. Check your internet connection.";
      });
  }

  // ----- Facebook -----
  const facebookBtn = document.getElementById("facebook-btn");
  let facebookReady = false;

  if (FACEBOOK_APP_ID) {
    // load early so the login popup can open straight from the click
    loadScript("https://connect.facebook.net/en_US/sdk.js")
      .then(() => {
        FB.init({
          appId: FACEBOOK_APP_ID,
          cookie: true,
          xfbml: false,
          version: "v23.0",
        });
        facebookReady = true;
      })
      .catch(() => {
        authStatus.textContent =
          "Could not load Facebook sign-in. Check your internet connection.";
      });
  }

  facebookBtn.addEventListener("click", () => {
    if (!FACEBOOK_APP_ID) {
      authStatus.textContent =
        "Facebook sign-in isn't set up yet. Add your FACEBOOK_APP_ID in script.js.";
      return;
    }
    if (!facebookReady) {
      authStatus.textContent =
        "Facebook is still loading. Try again in a moment.";
      return;
    }

    FB.login(
      (response) => {
        if (!response.authResponse) {
          authStatus.textContent = "Facebook sign-in was cancelled.";
          return;
        }
        FB.api("/me", { fields: "name,email,picture.width(200)" }, (user) => {
          signIn("Facebook", {
            name: user.name,
            email: user.email,
            picture: user.picture && user.picture.data && user.picture.data.url,
          });
        });
      },
      { scope: "public_profile,email" },
    );
  });

  // =========================
  // SETTINGS
  // =========================
  const settingStatus = document.getElementById("setting-status");

  function note(message) {
    settingStatus.textContent = message;
  }

  // ----- appearance -----
  const themeButtons = document.querySelectorAll("[data-theme-option]");
  const accentButtons = document.querySelectorAll("[data-accent-option]");

  function markAppearance() {
    themeButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.themeOption === settings.theme),
      );
    });
    accentButtons.forEach((button) => {
      button.setAttribute(
        "aria-pressed",
        String(button.dataset.accentOption === settings.accent),
      );
    });
  }

  markAppearance();

  themeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      settings.theme = button.dataset.themeOption;
      saveSettings();
      applyTheme();
      markAppearance();
    });
  });

  accentButtons.forEach((button) => {
    button.addEventListener("click", () => {
      settings.accent = button.dataset.accentOption;
      saveSettings();
      applyTheme();
      markAppearance();
    });
  });

  // ----- account -----
  document.getElementById("settings-logout").addEventListener("click", logOut);
  document
    .getElementById("settings-go-profile")
    .addEventListener("click", () => showPage("profile"));

  const timeFormatSelect = document.getElementById("setting-time-format");
  const tempUnitSelect = document.getElementById("setting-temp-unit");
  const greetingToggle = document.getElementById("setting-typing-greeting");
  const voiceLangSelect = document.getElementById("setting-voice-lang");

  timeFormatSelect.value = settings.timeFormat;
  tempUnitSelect.value = settings.tempUnit;
  greetingToggle.checked = settings.typingGreeting;
  voiceLangSelect.value = settings.voiceLang;

  timeFormatSelect.addEventListener("change", () => {
    settings.timeFormat = timeFormatSelect.value;
    saveSettings();
    updateDateTime();
    note("Time format saved.");
  });

  tempUnitSelect.addEventListener("change", () => {
    settings.tempUnit = tempUnitSelect.value;
    saveSettings();
    renderTemps();
    note("Temperature unit saved.");
  });

  greetingToggle.addEventListener("change", () => {
    settings.typingGreeting = greetingToggle.checked;
    saveSettings();
    typeMessage();
    note("Greeting setting saved.");
  });

  voiceLangSelect.addEventListener("change", () => {
    settings.voiceLang = voiceLangSelect.value;
    saveSettings();
    note("Voice language saved.");
  });

  enterToSend.addEventListener("change", () => {
    note("Send shortcut saved.");
  });

  // ----- your data -----
  document.getElementById("export-data").addEventListener("click", () => {
    const data = {};

    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith("zoro-"))
        .forEach((key) => {
          try {
            data[key] = JSON.parse(localStorage.getItem(key));
          } catch {
            data[key] = localStorage.getItem(key);
          }
        });
    } catch (error) {
      console.error("Export error:", error);
      note("Could not read your data.");
      return;
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = "zoro-data.json";
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);

    note("Your data was downloaded as zoro-data.json.");
  });

  document.getElementById("clear-history").addEventListener("click", () => {
    if (!confirm("Delete all your chats? This can't be undone.")) return;

    conversations = [];
    currentId = null;
    persist();
    renderChat();
    renderProfile();
    note("All chats were deleted.");
  });

  document.getElementById("clear-tasks-notes").addEventListener("click", () => {
    if (!confirm("Delete all your tasks and notes?")) return;

    tasks = [];
    notes = [];
    save("zoro-tasks", tasks);
    save("zoro-notes", notes);
    renderTasks();
    renderNotes();
    renderProfile();
    note("Tasks and notes cleared.");
  });

  document.getElementById("reset-all").addEventListener("click", () => {
    if (
      !confirm(
        "Reset Zoro? This deletes your profile, chats, tasks, notes and settings from this browser.",
      )
    )
      return;

    try {
      Object.keys(localStorage)
        .filter((key) => key.startsWith("zoro-"))
        .forEach((key) => localStorage.removeItem(key));
    } catch (error) {
      console.error("Reset error:", error);
    }

    location.reload();
  });

  // =========================================================
  // CHAT LIST PANEL - paste above "START"
  // (the panel itself is in index.html)
  // =========================================================
  (function setupChatList() {
    const chatList = document.getElementById("chat-list");
    const sidebarNewChat = document.getElementById("sidebar-new-chat");

    function renderChatList() {
      chatList.replaceChildren();

      // "New chat" is highlighted while no saved chat is open
      sidebarNewChat.classList.toggle(
        "bg-[color:var(--c-raised)]",
        currentId === null,
      );

      const sorted = [...conversations].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );

      if (!sorted.length) {
        const empty = document.createElement("p");
        empty.className = "px-2 py-3 text-xs text-[color:var(--c-faint)]";
        empty.textContent = "No chats yet. Send a message to start one.";
        chatList.appendChild(empty);
        return;
      }

      sorted.forEach((convo) => {
        const active = convo.id === currentId;

        const row = document.createElement("div");
        row.className =
          "group/item flex items-center gap-1 rounded-xl pr-1 transition-colors hover:bg-[color:var(--c-raised)]" +
          (active ? " bg-[color:var(--c-raised)]" : "");

        const open = document.createElement("button");
        open.type = "button";
        open.className =
          "min-w-0 flex-1 truncate px-3 py-2.5 text-left text-sm " +
          (active
            ? "text-[color:var(--c-text)]"
            : "text-[color:var(--c-muted)]");
        open.textContent = convo.title;
        open.title = convo.title;
        open.addEventListener("click", () => openConversation(convo.id));

        const rename = document.createElement("button");
        rename.type = "button";
        rename.title = "Rename chat";
        rename.setAttribute("aria-label", "Rename chat");
        rename.className =
          "hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs text-[color:var(--c-faint)] hover:text-[color:var(--c-text)] group-hover/item:flex";
        rename.textContent = "✎";
        rename.addEventListener("click", () => {
          const name = prompt("Rename chat", convo.title);
          if (name === null || !name.trim()) return;
          convo.title = name.trim().slice(0, 60);
          persist();
          renderChatList();
        });

        const del = document.createElement("button");
        del.type = "button";
        del.title = "Delete chat";
        del.setAttribute("aria-label", "Delete chat");
        del.className =
          "hidden h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs text-[color:var(--c-faint)] hover:text-[color:var(--c-danger)] group-hover/item:flex";
        del.textContent = "✕";
        del.addEventListener("click", () => {
          if (!confirm(`Delete "${convo.title}"?`)) return;

          conversations = conversations.filter((c) => c.id !== convo.id);
          if (currentId === convo.id) currentId = null;
          persist();

          renderChat();
          renderProfile();
        });

        row.append(open, rename, del);
        chatList.appendChild(row);
      });
    }

    // Keep the list in sync by wrapping your existing functions
    const baseRenderChat = renderChat;
    renderChat = function () {
      baseRenderChat();
      renderChatList();
    };

    const baseAddChatMessage = addChatMessage;
    addChatMessage = function (convo, message, isUser) {
      baseAddChatMessage(convo, message, isUser);
      renderChatList();
    };

    sidebarNewChat.addEventListener("click", () => {
      newChat();
      chatInput.focus();
    });

    renderChatList();
  })();

  // =========================
  // START
  // =========================
  showPage("home");
});
