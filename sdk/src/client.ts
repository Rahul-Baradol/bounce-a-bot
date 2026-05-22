import { SDKStream } from "./stream";
import type { PromptRequest } from "./types";

export class SDK {
    apiBaseUrl: string;
    tempUserId: string | null = null;

    constructor(config: { apiBaseUrl: string }) {
        this.apiBaseUrl = config.apiBaseUrl;
    }

    private async sendIngest(event: string, payload: any) {
        try {
            await fetch(`${this.apiBaseUrl}/ingest`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    event,
                    payload,
                }),
            });
        } catch (err) {
            // Ingest failures should not break normal flow.
            console.warn("Ingest failed:", err);
        }
    }

    async init() {
        let existing = localStorage.getItem("temp_user_id");

        if (!existing) {
            try {
                const res = await fetch(`${this.apiBaseUrl}/identify`, {
                    method: "POST",
                });

                const data = await res.json();

                existing = data.temp_user_id;

                if (existing) {
                    localStorage.setItem("temp_user_id", existing);

                    // ingest user identified event
                    await this.sendIngest("user.identified", {
                        temp_user_id: existing,
                        timestamp: new Date().toISOString(),
                    });
                } else {
                    console.log("lmao. backend is not returning the user_id :(");
                    await this.sendIngest("user.identified", {
                        temp_user_id: null,
                        timestamp: new Date().toISOString(),
                        error: "backend did not return temp_user_id",
                    });
                }
            } catch (err: any) {
                console.error("identify failed", err);
                await this.sendIngest("user.identified", {
                    temp_user_id: null,
                    timestamp: new Date().toISOString(),
                    error: String(err),
                });
            }
        }

        this.tempUserId = existing;
    }

    async listModels() {
        const res = await fetch(`${this.apiBaseUrl}/models`);

        return res.json();
    }

    async listConversations() {
        if (!this.tempUserId) {
            throw new Error("SDK not initialized. Call init() first.");
        }

        const res = await fetch(`${this.apiBaseUrl}/list-conversations/${this.tempUserId}`);

        if (!res.ok) {
            throw new Error("Failed to fetch conversations");
        }

        return res.json();
    }

    async getConversation(conversationId: string) {
        const res = await fetch(`${this.apiBaseUrl}/conversation/${conversationId}`);

        if (!res.ok) {
            throw new Error("Failed to fetch conversation");
        }

        return res.json();
    }

    async prompt(input: PromptRequest) {
        const controller = new AbortController();

        const stream = new SDKStream(controller);

        // Attach metadata for ingest tracking
        const meta: any = {
            startTime: Date.now(),
            modelId: input.modelId,
            inputPreview: input.prompt,
            conversationId: input.conversationId ?? null,
        };
        (stream as any)._meta = meta;

        // send message.created ingest
        this.sendIngest("message.created", {
            model: meta.modelId,
            timestamp: new Date(meta.startTime).toISOString(),
            conversation_id: meta.conversationId,
            input_preview: meta.inputPreview,
            request_status: "started",
        });

        const res = await fetch(`${this.apiBaseUrl}/prompt`, {
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
        });

        if (!res.ok) {
            const errText = await res.text().catch(() => "non-OK response");
            // ingest failure/completion with error
            await this.sendIngest("message.completed", {
                model: meta.modelId,
                latency_ms: Date.now() - meta.startTime,
                timestamps: {
                    started: new Date(meta.startTime).toISOString(),
                    completed: new Date().toISOString(),
                },
                status: "error",
                error: errText,
                conversation_id: meta.conversationId,
                input_preview: meta.inputPreview,
                output_preview: null,
            });

            throw new Error("Failed to prompt: " + errText);
        }

        this.consumeStream(res, stream);

        return stream;
    }

    async consumeStream(res: Response, stream: SDKStream) {
        const reader = res.body?.getReader();

        console.log("Started consuming stream...");

        if (!reader) return;

        const decoder = new TextDecoder();

        // metadata & accumulators
        const meta = (stream as any)._meta ?? { startTime: Date.now(), modelId: null, inputPreview: null, conversationId: null, provider: null };
        let outputPreview = "";
        let tokenUsage: any = null;
        let requestStatus: "success" | "error" = "success";

        try {
            while (true) {
                const { done, value } = await reader.read();

                if (done) break;

                const chunk = decoder.decode(value);

                // server sends SSE-style events separated by "\n\n"
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

                    let parsed: any;
                    try {
                        parsed = JSON.parse(dataLine);
                    } catch (e) {
                        parsed = { raw: dataLine };
                    }

                    // accumulate potential output text from common fields
                    const extractText = (p: any) => {
                        if (!p) return "";
                        if (typeof p === "string") return p;
                        return p.text ?? p.content ?? p.output ?? p.delta ?? p.delta?.content ?? p.message?.content ?? "";
                    };

                    const appended = extractText(parsed);
                    if (appended) {
                        outputPreview += appended;
                    } else if (typeof parsed === "object") {
                        // if no direct text, append a JSON snippet if small
                        try {
                            const snippet = JSON.stringify(parsed);
                            if (snippet && snippet.length < 1000) outputPreview += snippet;
                        } catch {}
                    }

                    // try to capture token usage if provided
                    if (parsed.usage) tokenUsage = parsed.usage;
                    if (parsed.tokens) tokenUsage = parsed.tokens;
                    if (!tokenUsage && parsed.usage?.total_tokens) tokenUsage = parsed.usage;

                    // emit events downstream
                    stream.emit(eventType, parsed);

                    // If the server explicitly sent a message.completed event, ingest it immediately
                    if (eventType === "message.completed") {
                        const completedTime = Date.now();
                        await this.sendIngest("message.completed", {
                            model: meta.modelId,
                            latency_ms: completedTime - meta.startTime,
                            token_usage: tokenUsage,
                            timestamps: {
                                started: new Date(meta.startTime).toISOString(),
                                completed: new Date(completedTime).toISOString(),
                            },
                            status: "success",
                            conversation_id: meta.conversationId,
                            input_preview: meta.inputPreview,
                            output_preview: outputPreview,
                            server_payload: parsed,
                        });
                    }
                }
            }

            // finished reading stream successfully
            const endTime = Date.now();
            await this.sendIngest("message.completed", {
                model: meta.modelId,
                latency_ms: endTime - meta.startTime,
                token_usage: tokenUsage,
                timestamps: {
                    started: new Date(meta.startTime).toISOString(),
                    completed: new Date(endTime).toISOString(),
                },
                status: requestStatus,
                conversation_id: meta.conversationId,
                input_preview: meta.inputPreview,
                output_preview: outputPreview,
            });
        } catch (err: any) {
            // on error while consuming stream
            const errTime = Date.now();
            requestStatus = "error";
            await this.sendIngest("message.completed", {
                model: meta.modelId,
                latency_ms: errTime - meta.startTime,
                token_usage: tokenUsage,
                timestamps: {
                    started: new Date(meta.startTime).toISOString(),
                    completed: new Date(errTime).toISOString(),
                },
                status: "error",
                error: String(err),
                conversation_id: meta.conversationId,
                input_preview: meta.inputPreview,
                output_preview: outputPreview,
            });

            // rethrow so caller can handle/observe
            throw err;
        }
    }
}