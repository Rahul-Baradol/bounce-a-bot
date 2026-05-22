import { useEffect, useState } from "react";
import {
  Activity,
  Brain,
  CheckCircle2,
  Clock3,
  Database,
  MessageSquare,
  Users,
  XCircle,
  Zap,
} from "lucide-react";

type AnalyticsResponse = {
  global: {
    created_at: string;
    failed_requests: number;
    last_event_at: string;
    successful_requests: number;
    total_latency_ms: number;
    total_requests: number;
    total_tokens: number;
    average_latency_ms: number;
  };
  users: Array<{
    temp_user_id: string;
    created_at: string;
    failed_requests: number;
    last_active_at: string;
    models_used: string[];
    successful_requests: number;
    total_latency_ms: number;
    total_messages: number;
    total_tokens: number;
    average_latency_ms: number;
  }>;
  conversations: Array<{
    conversation_id: string;
    last_message_at: string;
    message_count: number;
    models_used: string[];
    participants: (string | null)[];
    started_at: string;
    total_latency_ms: number;
    total_tokens: number;
    average_latency_ms: number;
  }>;
  models: Array<{
    model: string;
    created_at: string;
    failure_count: number;
    last_used_at: string;
    success_count: number;
    total_latency_ms: number;
    total_requests: number;
    total_tokens: number;
    average_latency_ms: number;
  }>;
};

function formatDate(date: string) {
  return new Date(date).toLocaleString();
}

function formatLatency(ms: number) {
  if (!ms) return "0ms";
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

function StatCard({
  title,
  value,
  icon,
  subtitle,
}: {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  subtitle?: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-zinc-400">{title}</p>
          <h2 className="mt-2 text-3xl font-semibold text-white">{value}</h2>
          {subtitle && (
            <p className="mt-2 text-xs text-zinc-500">{subtitle}</p>
          )}
        </div>

        <div className="rounded-2xl bg-white/10 p-3 text-zinc-200">
          {icon}
        </div>
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);

        const response = await fetch(
          `${import.meta.env.VITE_BACKEND_URL}/analytics`
        );

        if (!response.ok) {
          throw new Error("Failed to fetch analytics");
        }

        const json = await response.json();

        setData(json);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong");
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="flex items-center gap-3 text-zinc-400">
          <Activity className="animate-pulse" />
          Loading analytics...
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black px-6 text-center text-red-400">
        {error || "Failed to load analytics"}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-5xl font-bold tracking-tight">
              Analytics Dashboard
            </h1>
            <p className="mt-2 text-zinc-500">
              Real-time platform telemetry & usage insights
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-zinc-400">
            Last Event: {formatDate(data.global.last_event_at)}
          </div>
        </div>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
          <StatCard
            title="Total Requests"
            value={data.global.total_requests}
            subtitle="All incoming API requests"
            icon={<Zap size={22} />}
          />

          <StatCard
            title="Successful Requests"
            value={data.global.successful_requests}
            subtitle="Completed successfully"
            icon={<CheckCircle2 size={22} />}
          />

          <StatCard
            title="Failed Requests"
            value={data.global.failed_requests}
            subtitle="Errored requests"
            icon={<XCircle size={22} />}
          />

          <StatCard
            title="Avg Latency"
            value={formatLatency(data.global.average_latency_ms)}
            subtitle="Average response time"
            icon={<Clock3 size={22} />}
          />
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-6 flex items-center gap-3">
              <Users />
              <h2 className="text-2xl font-semibold">Users</h2>
            </div>

            <div className="space-y-4">
              {data.users.map((user) => (
                <div
                  key={user.temp_user_id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-5"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm text-zinc-300">
                        {user.temp_user_id}
                      </p>

                      <p className="mt-2 text-sm text-zinc-500">
                        Last Active: {formatDate(user.last_active_at)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-semibold">
                        {user.total_messages}
                      </p>
                      <p className="text-xs text-zinc-500">Messages</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="mb-6 flex items-center gap-3">
              <MessageSquare />
              <h2 className="text-2xl font-semibold">Conversations</h2>
            </div>

            <div className="space-y-4">
              {data.conversations.map((conversation) => (
                <div
                  key={conversation.conversation_id}
                  className="rounded-2xl border border-white/10 bg-black/30 p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-mono text-sm text-zinc-300">
                        {conversation.conversation_id}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-2">
                        {conversation.models_used.map((model) => (
                          <span
                            key={model}
                            className="rounded-full bg-white/10 px-3 py-1 text-xs text-zinc-300"
                          >
                            {model}
                          </span>
                        ))}
                      </div>

                      <p className="mt-3 text-sm text-zinc-500">
                        Started: {formatDate(conversation.started_at)}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-2xl font-semibold">
                        {conversation.message_count}
                      </p>
                      <p className="text-xs text-zinc-500">Messages</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-6 rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center gap-3">
            <Brain />
            <h2 className="text-2xl font-semibold">Models</h2>
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {data.models.map((model) => (
              <div
                key={model.model}
                className="rounded-2xl border border-white/10 bg-black/30 p-5"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold">{model.model}</h3>

                  <div className="rounded-xl bg-white/10 p-2">
                    <Database size={18} />
                  </div>
                </div>

                <div className="mt-6 space-y-3 text-sm">
                  <div className="flex justify-between text-zinc-400">
                    <span>Total Requests</span>
                    <span className="text-white">
                      {model.total_requests}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-400">
                    <span>Success Count</span>
                    <span className="text-white">{model.success_count}</span>
                  </div>

                  <div className="flex justify-between text-zinc-400">
                    <span>Failure Count</span>
                    <span className="text-white">{model.failure_count}</span>
                  </div>

                  <div className="flex justify-between text-zinc-400">
                    <span>Avg Latency</span>
                    <span className="text-white">
                      {formatLatency(model.average_latency_ms)}
                    </span>
                  </div>

                  <div className="flex justify-between text-zinc-400">
                    <span>Last Used</span>
                    <span className="text-white text-right">
                      {formatDate(model.last_used_at)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}