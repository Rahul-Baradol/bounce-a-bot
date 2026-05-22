import { useSDKHook } from "./hooks/sdk";

export default function App() {
  const { 
    conversations,
    openConversation,
    newChat,
    messages,
    prompt,
    setPrompt,
    sendPrompt,
    loading,
    cancelGeneration,
    selectedModel,
    setSelectedModel,
    models,
    conversationId
  } = useSDKHook();

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
              onClick={() =>
                openConversation(conv.id)
              }
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
            {models.map((model) => (
              <option
                key={model.id}
                value={model.id}
              >
                {model.name}
              </option>
            ))}
          </select>

          <div>
            Conversation:{" "}
            {conversationId || "new"}
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
              <button
                onClick={cancelGeneration}
              >
                Stop
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}