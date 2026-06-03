import React, { useEffect, useMemo, useState } from 'react';
import ReactDOM from 'react-dom/client';
import {
  BrowserRouter,
  Link,
  NavLink,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from 'react-router-dom';
import './styles.css';

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3001';

type MeetingSummary = {
  id: string;
  title: string | null;
  summary: string | null;
  created_at: string;
  processing_status: string | null;
};

type ActionItem = {
  owner: string | null;
  task: string;
  deadline: string | null;
  priority: string | null;
};

type Deadline = {
  date: string;
  description: string;
};

type Meeting = MeetingSummary & {
  transcript: string | null;
  action_items: ActionItem[] | null;
  deadlines: Deadline[] | null;
};

function formatDate(value: string | null | undefined) {
  if (!value) {
    return 'No date';
  }

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function previewText(value: string | null | undefined) {
  if (!value?.trim()) {
    return 'No summary yet.';
  }

  return value.length > 180 ? `${value.slice(0, 180).trim()}...` : value;
}

async function getJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`);
  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error ?? 'Request failed.');
  }

  return data as T;
}

function AppShell() {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-950">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <Link to="/meetings" className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-md bg-teal-600 text-sm font-semibold text-white">
              SB
            </span>
            <span>
              <span className="block text-sm font-semibold leading-5">SyncBrief</span>
              <span className="block text-xs text-zinc-500">Meeting intelligence</span>
            </span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-medium">
            <NavLink
              to="/meetings"
              className={({ isActive }) =>
                `rounded-md px-3 py-2 ${isActive ? 'bg-zinc-100 text-zinc-950' : 'text-zinc-600 hover:bg-zinc-100'}`
              }
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/meetings/upload"
              className="rounded-md bg-zinc-950 px-3 py-2 text-white hover:bg-zinc-800"
            >
              Upload
            </NavLink>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">
        <Routes>
          <Route path="/" element={<Navigate to="/meetings" replace />} />
          <Route path="/meetings" element={<DashboardPage />} />
          <Route path="/meetings/upload" element={<UploadMeetingPage />} />
          <Route path="/meetings/:id" element={<MeetingDetailPage />} />
        </Routes>
      </main>
    </div>
  );
}

function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-950">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-600">{description}</p>
      </div>
      {action}
    </div>
  );
}

function DashboardPage() {
  const [meetings, setMeetings] = useState<MeetingSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    getJson<{ meetings: MeetingSummary[] }>('/api/meetings')
      .then((data) => {
        if (isMounted) {
          setMeetings(data.meetings);
        }
      })
      .catch((requestError: Error) => {
        if (isMounted) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <PageHeader
        title="Meetings"
        description="Review processed meeting briefs, action items, deadlines, and transcripts."
        action={
          <Link
            to="/meetings/upload"
            className="inline-flex items-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
          >
            Upload meeting
          </Link>
        }
      />

      {isLoading && <LoadingBlock label="Loading meetings" />}
      {error && <ErrorBlock message={error} />}

      {!isLoading && !error && meetings.length === 0 && (
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white px-6 py-12 text-center">
          <h2 className="text-base font-semibold text-zinc-950">No meetings yet</h2>
          <p className="mt-2 text-sm text-zinc-600">Upload an audio file to create the first SyncBrief.</p>
          <Link
            to="/meetings/upload"
            className="mt-5 inline-flex rounded-md bg-zinc-950 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Upload audio
          </Link>
        </div>
      )}

      <div className="grid gap-3">
        {meetings.map((meeting) => (
          <Link
            key={meeting.id}
            to={`/meetings/${meeting.id}`}
            className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm transition hover:border-teal-300 hover:shadow-md"
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <h2 className="truncate text-base font-semibold text-zinc-950">
                  {meeting.title || 'Untitled meeting'}
                </h2>
                <p className="mt-2 text-sm leading-6 text-zinc-600">{previewText(meeting.summary)}</p>
              </div>
              <div className="shrink-0 text-left sm:text-right">
                <p className="text-sm text-zinc-500">{formatDate(meeting.created_at)}</p>
                {meeting.processing_status && (
                  <span className="mt-2 inline-flex rounded-full border border-zinc-200 px-2.5 py-1 text-xs font-medium capitalize text-zinc-600">
                    {meeting.processing_status}
                  </span>
                )}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}

function UploadMeetingPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!file) {
      setError('Choose an audio file before uploading.');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${apiBaseUrl}/api/meetings/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(data?.error ?? 'Upload failed.');
      }

      navigate(`/meetings/${data.meeting.id}`);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Upload failed.');
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Upload Meeting"
        description="Send an audio recording to SyncBrief for transcription, summary extraction, action items, and deadlines."
      />

      <form onSubmit={handleSubmit} className="max-w-2xl rounded-lg border border-zinc-200 bg-white p-6 shadow-sm">
        <label className="block">
          <span className="text-sm font-medium text-zinc-800">Audio file</span>
          <input
            type="file"
            accept="audio/*"
            disabled={isUploading}
            onChange={(event) => {
              setFile(event.target.files?.[0] ?? null);
              setError(null);
            }}
            className="mt-3 block w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-zinc-100 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-zinc-700 hover:file:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          />
        </label>

        {file && (
          <div className="mt-4 rounded-md bg-zinc-50 px-4 py-3 text-sm text-zinc-700">
            <span className="font-medium">{file.name}</span>
            <span className="ml-2 text-zinc-500">{Math.max(file.size / 1024 / 1024, 0.01).toFixed(2)} MB</span>
          </div>
        )}

        {error && <div className="mt-4"><ErrorBlock message={error} /></div>}

        <div className="mt-6 flex items-center gap-3">
          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex min-w-32 items-center justify-center rounded-md bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:bg-zinc-400"
          >
            {isUploading ? 'Processing...' : 'Upload'}
          </button>
          {isUploading && <span className="text-sm text-zinc-600">Transcribing and extracting meeting notes.</span>}
        </div>
      </form>
    </>
  );
}

function MeetingDetailPage() {
  const { id } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setError('Missing meeting id.');
      setIsLoading(false);
      return;
    }

    let isMounted = true;

    getJson<{ meeting: Meeting }>(`/api/meetings/${id}`)
      .then((data) => {
        if (isMounted) {
          setMeeting(data.meeting);
        }
      })
      .catch((requestError: Error) => {
        if (isMounted) {
          setError(requestError.message);
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [id]);

  const actionItems = useMemo(() => meeting?.action_items ?? [], [meeting]);
  const deadlines = useMemo(() => meeting?.deadlines ?? [], [meeting]);

  if (isLoading) {
    return <LoadingBlock label="Loading meeting" />;
  }

  if (error) {
    return <ErrorBlock message={error} />;
  }

  if (!meeting) {
    return <ErrorBlock message="Meeting not found." />;
  }

  return (
    <>
      <PageHeader
        title={meeting.title || 'Untitled meeting'}
        description={formatDate(meeting.created_at)}
        action={
          <Link to="/meetings" className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-semibold hover:bg-white">
            Back to dashboard
          </Link>
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="space-y-5">
          <Panel title="Summary">
            <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-700">{meeting.summary || 'No summary available.'}</p>
          </Panel>

          <Panel title="Full Transcript">
            <p className="max-h-[520px] overflow-auto whitespace-pre-wrap text-sm leading-7 text-zinc-700">
              {meeting.transcript || 'No transcript available.'}
            </p>
          </Panel>
        </section>

        <aside className="space-y-5">
          <Panel title="Action Items">
            {actionItems.length === 0 ? (
              <p className="text-sm text-zinc-600">No action items captured.</p>
            ) : (
              <div className="space-y-3">
                {actionItems.map((item, index) => (
                  <div key={`${item.task}-${index}`} className="rounded-md border border-zinc-200 p-3">
                    <p className="text-sm font-medium leading-6 text-zinc-950">{item.task}</p>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs text-zinc-600">
                      {item.owner && <Badge>{item.owner}</Badge>}
                      {item.deadline && <Badge>{item.deadline}</Badge>}
                      {item.priority && <Badge>{item.priority}</Badge>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>

          <Panel title="Deadlines">
            {deadlines.length === 0 ? (
              <p className="text-sm text-zinc-600">No deadlines captured.</p>
            ) : (
              <div className="space-y-3">
                {deadlines.map((deadline, index) => (
                  <div key={`${deadline.date}-${index}`} className="rounded-md border border-zinc-200 p-3">
                    <p className="text-sm font-semibold text-zinc-950">{deadline.date}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-600">{deadline.description}</p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </aside>
      </div>
    </>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg border border-zinc-200 bg-white p-5 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold uppercase text-zinc-500">{title}</h2>
      {children}
    </section>
  );
}

function Badge({ children }: { children: React.ReactNode }) {
  return <span className="rounded-full bg-zinc-100 px-2.5 py-1 font-medium text-zinc-700">{children}</span>;
}

function LoadingBlock({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-6 text-sm text-zinc-600 shadow-sm">
      {label}...
    </div>
  );
}

function ErrorBlock({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
      {message}
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  </React.StrictMode>,
);
