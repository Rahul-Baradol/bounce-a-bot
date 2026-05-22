import { useEffect, useRef, useState } from "react";

type Conversation = {
  id: string;
  title: string;
};

type Message = {
  recipient: "user" | "bot";
  message: string;
};

const API_BASE = "http://localhost:8001";

const MODELS = [
  "gpt-4.1",
  "claude-sonnet",
  "gemini-pro",
];

export default function App() {
  const [tempUserId, setTempUserId] = useState<string | null>(null);

  const [conversations, setConversations] = useState<Conversation[]>([]);

  const [conversationId, setConversationId] = useState<string | null>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  const [prompt, setPrompt] = useState("");

  const [selectedModel, setSelectedModel] = useState("gpt-4.1");

  const [loading, setLoading] = useState(false);

  const abortControllerRef = useRef<AbortController | null>(null);

  // -------------------------------------------------------------
  // Bootstrap temp user
  // -------------------------------------------------------------

  useEffect(() => {
    bootstrap();
  }, []);

  async function bootstrap() {
    let existing = localStorage.getItem("temp_user_id");

    if (!existing) {
      const res = await fetch(`${API_BASE}/identify`, {
        method: "POST",
      });

      const data = await res.json();

      existing = data.temp_user_id;

      localStorage.setItem("temp_user_id", existing);
    }

    setTempUserId(existing);

    await loadConversations(existing);
  }

  // -------------------------------------------------------------
  // Load conversations
  // -------------------------------------------------------------

  async function loadConversations(userId: string) {
    const res = await fetch(
      `${API_BASE}/list-conversations/${userId}`
    );

    const data = await res.json();

    setConversations(data);
  }

  // -------------------------------------------------------------
  // Open conversation
  // -------------------------------------------------------------

  async function openConversation(id: string) {
    const res = await fetch(
      `${API_BASE}/conversation/${id}`
    );

    const data = await res.json();

    setConversationId(id);
    setMessages(data);
  }

  // -------------------------------------------------------------
  // Send prompt
  // -------------------------------------------------------------

  async function sendPrompt() {
    if (!prompt.trim()) return;

    if (!tempUserId) return;

    setLoading(true);

    const userMessage: Message = {
      recipient: "user",
      message: prompt,
    };

    setMessages((prev) => [...prev, userMessage]);

    const currentPrompt = prompt;

    setPrompt("");

    const controller = new AbortController();

    abortControllerRef.current = controller;

    const res = await fetch(`${API_BASE}/prompt`, {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model_id: selectedModel,
        prompt: currentPrompt,
        temp_user_id: tempUserId,
        conversation_id: conversationId,
      }),
    });

    const reader = res.body?.getReader();

    if (!reader) {
      setLoading(false);
      return;
    }

    const decoder = new TextDecoder();

    let assistantMessage = "";

    setMessages((prev) => [
      ...prev,
      {
        recipient: "bot",
        message: "",
      },
    ]);

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      const chunk = decoder.decode(value);

      const events = chunk
        .split("\n\n")
        .filter(Boolean);

      for (const eventBlock of events) {
        const lines = eventBlock.split("\n");

        let eventType = "";
        let dataLine = "";

        for (const line of lines) {
          if (line.startsWith("event:")) {
            eventType = line.replace("event:", "").trim();
          }

          if (line.startsWith("data:")) {
            dataLine = line.replace("data:", "").trim();
          }
        }

        if (!dataLine) continue;

        const parsed = JSON.parse(dataLine);

        // ---------------------------------------------
        // conversation.created
        // ---------------------------------------------

        if (eventType === "conversation.created") {
          setConversationId(parsed.conversation_id);

          await loadConversations(tempUserId);
        }

        // ---------------------------------------------
        // message.delta
        // ---------------------------------------------

        if (eventType === "message.delta") {
          assistantMessage += parsed.token;

          setMessages((prev) => {
            const copy = [...prev];

            copy[copy.length - 1] = {
              recipient: "bot",
              message: assistantMessage,
            };

            return copy;
          });
        }
      }
    }

    setLoading(false);
  }

  // -------------------------------------------------------------
  // Cancel stream
  // -------------------------------------------------------------

  function cancelGeneration() {
    abortControllerRef.current?.abort();

    setLoading(false);
  }

  // -------------------------------------------------------------
  // New chat
  // -------------------------------------------------------------

  function newChat() {
    setConversationId(null);
    setMessages([]);
  }

  return (
    <div
      style={{
        display: "flex",
        height: "100vh",
        fontFamily: "sans-serif",
      }}
    >
      {/* Sidebar */}

      <div
        style={{
          width: 280,
          borderRight: "1px solid #ddd",
          padding: 16,
          overflowY: "auto",
        }}
      >
        <button
          onClick={newChat}
          style={{
            width: "100%",
            marginBottom: 16,
            padding: 12,
          }}
        >
          New Chat
        </button>

        <div>
          {conversations.map((conv) => (
            <div
              key={conv.id}
              onClick={() => openConversation(conv.id)}
              style={{
                padding: 12,
                border: "1px solid #eee",
                marginBottom: 8,
                cursor: "pointer",
                borderRadius: 8,
              }}
            >
              {conv.title}
            </div>
          ))}
        </div>
      </div>

      {/* Main */}

      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Header */}

        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #ddd",
            display: "flex",
            gap: 12,
          }}
        >
          <select
            value={selectedModel}
            onChange={(e) =>
              setSelectedModel(e.target.value)
            }
          >
            {MODELS.map((model) => (
              <option key={model} value={model}>
                {model}
              </option>
            ))}
          </select>

          <div>
            Conversation: {conversationId || "new"}
          </div>
        </div>

        {/* Messages */}

        <div
          style={{
            flex: 1,
            overflowY: "auto",
            padding: 24,
          }}
        >
          {messages.map((msg, idx) => (
            <div
              key={idx}
              style={{
                marginBottom: 16,
                display: "flex",
                justifyContent:
                  msg.recipient === "user"
                    ? "flex-end"
                    : "flex-start",
              }}
            >
              <div
                style={{
                  padding: 12,
                  borderRadius: 12,
                  background:
                    msg.recipient === "user"
                      ? "#dbeafe"
                      : "#f3f4f6",
                  maxWidth: 700,
                  whiteSpace: "pre-wrap",
                }}
              >
                {msg.message}
              </div>
            </div>
          ))}
        </div>

        {/* Input */}

        <div
          style={{
            padding: 16,
            borderTop: "1px solid #ddd",
          }}
        >
          <div
            style={{
              display: "flex",
              gap: 12,
            }}
          >
            <input
              value={prompt}
              onChange={(e) =>
                setPrompt(e.target.value)
              }
              placeholder="Type a message..."
              style={{
                flex: 1,
                padding: 12,
              }}
            />

            {!loading ? (
              <button onClick={sendPrompt}>
                Send
              </button>
            ) : (
              <button onClick={cancelGeneration}>
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}