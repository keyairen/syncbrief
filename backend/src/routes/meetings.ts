import { type Response, Router } from 'express';
import multer from 'multer';
import { toFile } from 'openai';
import { openai } from '../lib/openai.js';
import { supabase } from '../lib/supabase.js';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 25 * 1024 * 1024,
    files: 1,
  },
});
const uploadAudio = upload.any();

type ExtractedMeeting = {
  title: string;
  summary: string;
  actionItems: Array<{
    owner: string | null;
    task: string;
    deadline: string | null;
    priority: string | null;
  }>;
  deadlines: Array<{
    date: string;
    description: string;
  }>;
};

function isAudioFile(file: Express.Multer.File) {
  return file.mimetype.startsWith('audio/');
}

function normalizeExtractedMeeting(value: Partial<ExtractedMeeting>): ExtractedMeeting {
  return {
    title: typeof value.title === 'string' && value.title.trim() ? value.title.trim() : 'Untitled meeting',
    summary: typeof value.summary === 'string' ? value.summary.trim() : '',
    actionItems: Array.isArray(value.actionItems)
      ? value.actionItems.map((item) => ({
          owner: typeof item.owner === 'string' && item.owner.trim() ? item.owner.trim() : null,
          task: typeof item.task === 'string' ? item.task.trim() : '',
          deadline: typeof item.deadline === 'string' && item.deadline.trim() ? item.deadline.trim() : null,
          priority: typeof item.priority === 'string' && item.priority.trim() ? item.priority.trim() : null,
        })).filter((item) => item.task)
      : [],
    deadlines: Array.isArray(value.deadlines)
      ? value.deadlines.map((deadline) => ({
          date: typeof deadline.date === 'string' ? deadline.date.trim() : '',
          description: typeof deadline.description === 'string' ? deadline.description.trim() : '',
        })).filter((deadline) => deadline.date && deadline.description)
      : [],
  };
}

function parseMeetingJson(content: string | null): ExtractedMeeting {
  if (!content) {
    throw new Error('OpenAI did not return meeting JSON');
  }

  return normalizeExtractedMeeting(JSON.parse(content) as Partial<ExtractedMeeting>);
}

function sendUploadError(res: Response, error: unknown) {
  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(status).json({ error: error.message });
    return true;
  }

  return false;
}

router.get('/', async (_req, res) => {
  try {
    const { data, error } = await supabase
      .from('meetings')
      .select('id, title, summary, created_at, processing_status')
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ meetings: data });
  } catch (error) {
    console.error('Failed to list meetings:', error);
    res.status(500).json({ error: 'Failed to list meetings.' });
  }
});

router.get('/search', async (req, res) => {
  try {
    const rawQuery = typeof req.query.q === 'string' ? req.query.q.trim() : '';
    const query = rawQuery.replace(/[%,]/g, ' ').trim();

    if (!query) {
      res.status(400).json({ error: 'Search query is required.' });
      return;
    }

    const pattern = `%${query}%`;
    const { data, error } = await supabase
      .from('meetings')
      .select('id, title, summary, created_at, processing_status')
      .or(`title.ilike.${pattern},summary.ilike.${pattern},transcript.ilike.${pattern}`)
      .order('created_at', { ascending: false });

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    res.json({ meetings: data });
  } catch (error) {
    console.error('Failed to search meetings:', error);
    res.status(500).json({ error: 'Failed to search meetings.' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { data: meeting, error } = await supabase
      .from('meetings')
      .select('*')
      .eq('id', req.params.id)
      .maybeSingle();

    if (error) {
      res.status(500).json({ error: error.message });
      return;
    }

    if (!meeting) {
      res.status(404).json({ error: 'Meeting not found.' });
      return;
    }

    res.json({ meeting });
  } catch (error) {
    console.error('Failed to get meeting:', error);
    res.status(500).json({ error: 'Failed to get meeting.' });
  }
});

router.post('/upload', (req, res) => {
  uploadAudio(req, res, async (uploadError) => {
    if (sendUploadError(res, uploadError)) {
      return;
    }

    if (uploadError) {
      res.status(400).json({ error: 'Invalid multipart/form-data upload.' });
      return;
    }

    try {
      const files = req.files as Express.Multer.File[] | undefined;
      const file = files?.[0];

      if (!file) {
        res.status(400).json({ error: 'Upload one audio file using multipart/form-data.' });
        return;
      }

      if (files.length !== 1) {
        res.status(400).json({ error: 'Upload exactly one audio file.' });
        return;
      }

      if (!isAudioFile(file)) {
        res.status(400).json({ error: 'Uploaded file must be an audio file.' });
        return;
      }

      const audioFile = await toFile(file.buffer, file.originalname, {
        type: file.mimetype,
      });

      const transcription = await openai.audio.transcriptions.create({
        file: audioFile,
        model: 'whisper-1',
      });

      const transcript = transcription.text?.trim();

      if (!transcript) {
        res.status(502).json({ error: 'OpenAI returned an empty transcript.' });
        return;
      }

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content:
              'Extract meeting notes from transcripts. Return only JSON with keys: title, summary, actionItems, deadlines. actionItems must be an array of { owner, task, deadline, priority }. deadlines must be an array of { date, description }. Use null when owner, deadline, or priority is unknown.',
          },
          {
            role: 'user',
            content: `Transcript:\n${transcript}`,
          },
        ],
      });

      const extracted = parseMeetingJson(completion.choices[0]?.message.content ?? null);

      const { data: meeting, error } = await supabase
        .from('meetings')
        .insert({
          title: extracted.title,
          transcript,
          summary: extracted.summary,
          action_items: extracted.actionItems,
          deadlines: extracted.deadlines,
          audio_filename: file.originalname,
        })
        .select('*')
        .single();

      if (error) {
        res.status(500).json({ error: error.message });
        return;
      }

      res.status(201).json({ meeting });
    } catch (error) {
      if (sendUploadError(res, error)) {
        return;
      }

      if (error instanceof SyntaxError) {
        res.status(502).json({ error: 'OpenAI returned invalid meeting JSON.' });
        return;
      }

      console.error('Meeting upload failed:', error);
      res.status(500).json({ error: 'Failed to process meeting upload.' });
    }
  });
});

export default router;
