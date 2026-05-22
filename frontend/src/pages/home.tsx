import React, { useState } from "react";
import { useSDKHook } from "../hooks/sdk";

export default function Hope() {
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
    conversationId,
  } = useSDKHook();

  // State to manage the mobile sidebar
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Helper to handle conversation switching on mobile (closes the menu)
  const handleSelectConversation = (id) => {
    openConversation(id);
    setIsSidebarOpen(false);
  };

  return (
    <>
      <style>{`
        /* 1. Global Reset to fix the black edges */
        html, body {
          margin: 0;
          padding: 0;
          width: 100%;
          height: 100%;
          background-color: #f1f5f9;
        }
        
        * { box-sizing: border-box; }
        
        /* Custom Scrollbars */
        .custom-scrollbar::-webkit-scrollbar { width: 6px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        
        /* Buttons */
        .btn-primary {
          background: linear-gradient(135deg, #6366f1, #4f46e5);
          color: white;
          transition: all 0.2s ease;
        }
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(79, 70, 229, 0.3);
        }
        
        .btn-danger {
          background: #ef4444;
          color: white;
          transition: all 0.2s ease;
        }
        .btn-danger:hover {
          background: #dc2626;
          box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
        }

        .sidebar-item {
          transition: all 0.2s ease;
          border: 1px solid transparent;
        }
        .sidebar-item:hover {
          background: #f8fafc;
          border-color: #e2e8f0;
          transform: translateX(4px);
        }
        
        /* Inputs & Glassmorphism */
        .chat-input::placeholder { color: #94a3b8; }
        .chat-input:focus { outline: none; }

        .glass-header {
          background: rgba(248, 250, 252, 0.85);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
        }

        /* Responsive Layout Rules */
        .layout-container {
          display: flex;
          height: 100vh;
          width: 100vw;
          overflow: hidden;
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          background-color: #f1f5f9;
          color: #1e293b;
        }

        .sidebar {
          width: 280px;
          background-color: #ffffff;
          border-right: 1px solid #e2e8f0;
          display: flex;
          flex-direction: column;
          z-index: 50;
          transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }

        .mobile-overlay {
          display: none;
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.4);
          backdrop-filter: blur(2px);
          z-index: 40;
          opacity: 0;
          transition: opacity 0.3s ease;
        }

        .menu-btn {
          display: none;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 8px;
          color: #475569;
        }

        /* Mobile Breakpoint */
        @media (max-width: 768px) {
          .sidebar {
            position: fixed;
            height: 100vh;
            left: 0;
            top: 0;
            transform: translateX(-100%);
            box-shadow: 4px 0 25px rgba(0,0,0,0.1);
          }
          
          .sidebar.open {
            transform: translateX(0);
          }

          .mobile-overlay.open {
            display: block;
            opacity: 1;
          }

          .menu-btn {
            display: flex;
            align-items: center;
            justify-content: center;
          }

          .header-controls {
            flex-direction: row-reverse;
          }
          
          /* Slightly tighter padding for mobile screens */
          .chat-input-container {
            padding: 12px !important;
          }
          .chat-bubble {
            max-width: 95% !important;
          }
        }
      `}</style>

      <div className="layout-container">
        
        {/* === MOBILE OVERLAY === */}
        <div 
          className={`mobile-overlay ${isSidebarOpen ? "open" : ""}`} 
          onClick={() => setIsSidebarOpen(false)}
        />

        {/* === SIDEBAR === */}
        <div className={`sidebar ${isSidebarOpen ? "open" : ""}`}>
          <div style={{ padding: 20 }}>
            <button
              className="btn-primary"
              onClick={() => {
                newChat();
                setIsSidebarOpen(false);
              }}
              style={{
                width: "100%",
                padding: "12px 16px",
                border: "none",
                borderRadius: 12,
                fontSize: 15,
                fontWeight: 600,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              New Chat
            </button>
          </div>

          <div className="custom-scrollbar" style={{ flex: 1, overflowY: "auto", padding: "0 20px 20px" }}>
            <div style={{ fontSize: 12, fontWeight: 600, color: "#94a3b8", marginBottom: 12, textTransform: "uppercase", letterSpacing: "0.5px" }}>
              Recent Conversations
            </div>
            {conversations.map((conv) => {
              const isActive = conv.id === conversationId;
              return (
                <div
                  key={conv.id}
                  className="sidebar-item"
                  onClick={() => handleSelectConversation(conv.id)}
                  style={{
                    padding: "12px 16px",
                    marginBottom: 8,
                    cursor: "pointer",
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? "#4f46e5" : "#475569",
                    background: isActive ? "#eef2ff" : "transparent",
                    border: isActive ? "1px solid #c7d2fe" : "1px solid transparent",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {conv.title || "Untitled Chat"}
                </div>
              );
            })}
          </div>
        </div>

        {/* === MAIN CHAT AREA === */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", position: "relative", minWidth: 0 }}>
          
          {/* Header */}
          <div
            className="glass-header"
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              padding: "12px 20px",
              borderBottom: "1px solid #e2e8f0",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              zIndex: 5,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button className="menu-btn" onClick={() => setIsSidebarOpen(true)}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="3" y1="12" x2="21" y2="12"></line>
                  <line x1="3" y1="6" x2="21" y2="6"></line>
                  <line x1="3" y1="18" x2="21" y2="18"></line>
                </svg>
              </button>
              <div style={{ fontWeight: 600, color: "#334155", fontSize: 15, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {conversationId ? `Chat: ${conversationId}` : "Start a new conversation"}
              </div>
            </div>
            
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              style={{
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid #cbd5e1",
                backgroundColor: "#ffffff",
                color: "#475569",
                fontSize: 14,
                fontWeight: 500,
                outline: "none",
                cursor: "pointer",
                boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
                maxWidth: "140px",
              }}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name}
                </option>
              ))}
            </select>
          </div>

          {/* Messages */}
          <div
            className="custom-scrollbar"
            style={{
              flex: 1,
              overflowY: "auto",
              padding: "80px 20px 20px", 
              display: "flex",
              flexDirection: "column",
              scrollBehavior: "smooth",
            }}
          >
            <div style={{ maxWidth: 800, margin: "0 auto", width: "100%" }}>
              {messages.length === 0 && (
                 <div style={{ textAlign: "center", marginTop: "15vh", color: "#94a3b8", padding: "0 20px" }}>
                   <div style={{ fontSize: 48, marginBottom: 16 }}>✨</div>
                   <h2 style={{ fontSize: 24, fontWeight: 600, color: "#1e293b", margin: "0 0 8px" }}>How can I help you?</h2>
                   <p style={{ fontSize: 15 }}>Send a message to get started.</p>
                 </div>
              )}

              {messages.map((msg, idx) => {
                const isUser = msg.recipient === "user";
                return (
                  <div
                    key={idx}
                    style={{
                      marginBottom: 24,
                      display: "flex",
                      justifyContent: isUser ? "flex-end" : "flex-start",
                    }}
                  >
                    <div
                      className="chat-bubble"
                      style={{
                        padding: "14px 20px",
                        borderRadius: isUser ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
                        background: isUser ? "linear-gradient(135deg, #6366f1, #4f46e5)" : "#ffffff",
                        color: isUser ? "#ffffff" : "#1e293b",
                        maxWidth: "85%",
                        fontSize: 15,
                        lineHeight: 1.6,
                        whiteSpace: "pre-wrap",
                        boxShadow: isUser 
                          ? "0 4px 12px rgba(79, 70, 229, 0.2)" 
                          : "0 2px 8px rgba(0,0,0,0.04)",
                        border: isUser ? "none" : "1px solid #e2e8f0",
                        wordBreak: "break-word"
                      }}
                    >
                      {msg.message}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Input Area */}
          <div className="chat-input-container" style={{ padding: "20px 24px", background: "transparent" }}>
            <div style={{ maxWidth: 800, margin: "0 auto" }}>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  background: "#ffffff",
                  padding: "8px 8px 8px 20px",
                  borderRadius: 999,
                  boxShadow: "0 10px 25px -5px rgba(0, 0, 0, 0.05), 0 8px 10px -6px rgba(0, 0, 0, 0.01)",
                  border: "1px solid #e2e8f0",
                  alignItems: "center",
                }}
              >
                <input
                  className="chat-input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && prompt.trim() && !loading) {
                      e.preventDefault();
                      sendPrompt();
                    }
                  }}
                  placeholder="Message the AI..."
                  style={{
                    flex: 1,
                    border: "none",
                    background: "transparent",
                    fontSize: 16,
                    color: "#1e293b",
                    padding: "8px 0",
                    width: "100%", // Ensures input doesn't push layout on mobile
                  }}
                />

                {!loading ? (
                  <button
                    className="btn-primary"
                    onClick={sendPrompt}
                    disabled={!prompt.trim()}
                    style={{
                      padding: "10px 20px",
                      border: "none",
                      borderRadius: 999,
                      fontWeight: 600,
                      cursor: prompt.trim() ? "pointer" : "not-allowed",
                      opacity: prompt.trim() ? 1 : 0.5,
                      whiteSpace: "nowrap",
                    }}
                  >
                    Send
                  </button>
                ) : (
                  <button
                    className="btn-danger"
                    onClick={cancelGeneration}
                    style={{
                      padding: "10px 20px",
                      border: "none",
                      borderRadius: 999,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <rect x="6" y="6" width="12" height="12"></rect>
                    </svg>
                    Stop
                  </button>
                )}
              </div>
              <div style={{ textAlign: "center", marginTop: 12, fontSize: 12, color: "#94a3b8" }}>
                AI models can make mistakes. Consider verifying important information.
              </div>
            </div>
          </div>
          
        </div>
      </div>
    </>
  );
}