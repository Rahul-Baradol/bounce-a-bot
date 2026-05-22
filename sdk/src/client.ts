import { SDKStream } from "./stream";
import type { PromptRequest } from "./types";

export class SDK {
    apiBaseUrl: string;
    tempUserId: string | null = null;

    constructor(config: { apiBaseUrl: string }) {
        this.apiBaseUrl = config.apiBaseUrl;
    }

    async init() {
        let existing = localStorage.getItem("temp_user_id");

        if (!existing) {
            const res = await fetch(
                `${this.apiBaseUrl}/identify`,
                {
                    method: "POST",
                }
            );

            const data = await res.json();

            existing = data.temp_user_id;

            if (existing) {
                localStorage.setItem(
                    "temp_user_id",
                    existing
                );
            } else {
                console.log("lmao. backend is not returning the user_id :(");
            }
        }

        this.tempUserId = existing;
    }

    async listModels() {
        const res = await fetch(
            `${this.apiBaseUrl}/models`
        );

        return res.json();
    }

    async listConversations() {
        if (!this.tempUserId) {
            throw new Error(
                "SDK not initialized. Call init() first."
            );
        }

        const res = await fetch(
            `${this.apiBaseUrl}/list-conversations/${this.tempUserId}`
        );

        if (!res.ok) {
            throw new Error(
                "Failed to fetch conversations"
            );
        }

        return res.json();
    }

    async getConversation(
        conversationId: string
    ) {
        const res = await fetch(
            `${this.apiBaseUrl}/conversation/${conversationId}`
        );

        if (!res.ok) {
            throw new Error(
                "Failed to fetch conversation"
            );
        }

        return res.json();
    }

    async prompt(input: PromptRequest) {
        const controller = new AbortController();

        const stream = new SDKStream(controller);

        const res = await fetch(
            `${this.apiBaseUrl}/prompt`,
            {
                method: "POST",
                signal: controller.signal,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model_id: input.modelId,
                    prompt: input.prompt,
                    temp_user_id: this.tempUserId,
                    conversation_id: input.conversationId,
                }),
            }
        );

        this.consumeStream(res, stream);

        return stream;
    }

    async consumeStream(res: Response, stream: SDKStream) {
        const reader = res.body?.getReader();

        console.log("Started consuming stream...");

        if (!reader) return;

        const decoder = new TextDecoder();

        while (true) {
            const { done, value } =
                await reader.read();

            if (done) break;

            const chunk = decoder.decode(value);

            const events = chunk
                .split("\\n\\n")
                .filter(Boolean);

            for (const eventBlock of events) {
                const lines = eventBlock.split("\n");

                let eventType = "";
                let dataLine = "";

                for (const line of lines) {
                    if (line.startsWith("event:")) {
                        eventType = line.replace(
                            "event:",
                            ""
                        ).trim();
                    }

                    if (line.startsWith("data:")) {
                        dataLine = line.replace(
                            "data:",
                            ""
                        ).trim();
                    }
                }

                if (!dataLine) continue;

                const parsed = JSON.parse(dataLine);

                stream.emit(eventType, parsed);
            }
        }
    }
}