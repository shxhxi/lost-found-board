import { NextResponse } from 'next/server';

const DEEPSEEK_URL = 'https://api.deepseek.com/chat/completions';

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const title = String(body.title ?? '').trim();
    const description = String(body.description ?? '').trim();
    const itemType = String(body.item_type ?? '').trim();
    const category = String(body.category ?? '').trim();
    const location = String(body.location ?? '').trim();
    const city = String(body.city ?? '').trim();
    const zipCode = String(body.zip_code ?? '').trim();

    if (!title || !description) {
      return NextResponse.json(
        { error: 'Title and description are required.' },
        { status: 400 }
      );
    }

    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Missing DEEPSEEK_API_KEY.' },
        { status: 500 }
      );
    }

    const prompt = [
      'Write a concise 1-2 sentence summary for an East Bay lost-and-found listing.',
      `Type: ${itemType || 'unknown'}`,
      `Category: ${category || 'unknown'}`,
      `Location: ${location || 'unknown'}`,
      `City: ${city || 'unknown'}`,
      `ZIP: ${zipCode || 'unknown'}`,
      `Title: ${title}`,
      `Description: ${description}`,
      'Keep it clear, local, human, and helpful for scanning search results.',
      'Do not use bullet points.',
      'Do not add facts that were not provided.',
    ].join('\n');

    const response = await fetch(DEEPSEEK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-v4-flash',
        stream: false,
        temperature: 0.5,
        messages: [
          {
            role: 'system',
            content:
              'You write short, useful summaries for East Bay lost-and-found listings.',
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return NextResponse.json(
        { error: errorText || 'DeepSeek request failed.' },
        { status: 500 }
      );
    }

    const data = await response.json();
    const summary = data?.choices?.[0]?.message?.content?.trim();

    if (!summary) {
      return NextResponse.json(
        { error: 'No summary was generated.' },
        { status: 500 }
      );
    }

    return NextResponse.json({ summary });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to generate summary.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}