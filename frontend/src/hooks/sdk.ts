import { useEffect, useRef, useState } from "react";
import { SDK } from "bouncy-bot-sdk";

type Conversation = {
  id: string;
  title: string;
};

type Message = {
  recipient: "user" | "bot";
  message: string;
};

const sdk = new SDK({
  apiBaseUrl: "http://localhost:8001",
});

export function useSDKHook() {
    const [conversations, setConversations] = useState<
        Conversation[]
    >([]);

    const [conversationId, setConversationId] =
        useState<string | null>(null);

    const [messages, setMessages] = useState<Message[]>([]);

    const [prompt, setPrompt] = useState("");

    const [models, setModels] = useState<any[]>([]);

    const [selectedModel, setSelectedModel] =
        useState("gpt-4.1");

    const [loading, setLoading] = useState(false);

    const streamRef = useRef<any>(null);

    useEffect(() => {
        init();
    }, []);

    async function init() {
        await sdk.init();

        const availableModels =
            await sdk.listModels();

        setModels(availableModels);

        await refreshConversations();
    }

    async function refreshConversations() {
        const data =
            await sdk.listConversations();

        setConversations(data);
    }

    async function openConversation(id: string) {
        const data =
            await sdk.getConversation(id);

        setConversationId(id);

        setMessages(data);
    }

    async function sendPrompt() {
        if (!prompt.trim()) return;

        setLoading(true);

        const currentPrompt = prompt;

        setPrompt("");

        setMessages((prev) => [
            ...prev,
            {
                recipient: "user",
                message: currentPrompt,
            },
            {
                recipient: "bot",
                message: "",
            },
        ]);

        let assistantMessage = "";

        const stream = await sdk.prompt({
            modelId: selectedModel,
            prompt: currentPrompt,
            conversationId,
        });

        streamRef.current = stream;

        stream.on(
            "conversation.created",
            async (event: any) => {
                setConversationId(
                    event.conversation_id
                );

                await refreshConversations();
            }
        );

        stream.on(
            "message.delta",
            (event: any) => {
                assistantMessage += event.token;

                setMessages((prev) => {
                    const copy = [...prev];

                    copy[copy.length - 1] = {
                        recipient: "bot",
                        message: assistantMessage,
                    };

                    return copy;
                });
            }
        );

        stream.on(
            "message.completed",
            () => {
                setLoading(false);
            }
        );

        // ---------------------------------------------------------
        // error
        // ---------------------------------------------------------

        stream.on("error", (err: any) => {
            console.error(err);

            setLoading(false);
        });
    }

    function cancelGeneration() {
        streamRef.current?.cancel();

        setLoading(false);
    }

    function newChat() {
        setConversationId(null);

        setMessages([]);
    }

    return {
        conversations,
        conversationId,
        messages,
        prompt,
        models,
        selectedModel,
        loading,
        streamRef,
        setConversations,
        setConversationId,
        setMessages,
        setPrompt,
        setModels,
        setSelectedModel,
        setLoading,
        init,
        refreshConversations,
        openConversation,
        sendPrompt,
        cancelGeneration,
        newChat
    };
}