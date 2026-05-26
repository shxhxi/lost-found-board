import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const itemId = String(body.itemId ?? '').trim();
    const itemTitle = String(body.itemTitle ?? '').trim();
    const itemType = String(body.itemType ?? '').trim();
    const location = String(body.location ?? '').trim();
    const contactEmail = String(body.contactEmail ?? '').trim();
    const message = String(body.message ?? '').trim();
    const ownerEmail = String(body.ownerEmail ?? '').trim();

    if (!itemId || !itemTitle || !contactEmail || !message) {
      return NextResponse.json(
        { error: 'Missing required claim details.' },
        { status: 400 }
      );
    }

    const fallbackEmail = process.env.ADMIN_EMAIL?.trim() ?? '';
    const toEmail = ownerEmail || fallbackEmail;

    if (!toEmail) {
      return NextResponse.json(
        { error: 'No destination email is configured.' },
        { status: 500 }
      );
    }

    const siteUrl =
      (process.env.NEXT_PUBLIC_SITE_URL || new URL(request.url).origin).replace(
        /\/$/,
        ''
      );

    const itemUrl = `${siteUrl}/items/${itemId}`;

    await resend.emails.send({
      from: 'onboarding@resend.dev',
      to: toEmail,
      subject: `New claim on ${itemTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>New Claim Submitted</h2>
          <p><strong>Item:</strong> ${itemTitle}</p>
          <p><strong>Type:</strong> ${itemType || '—'}</p>
          <p><strong>Location:</strong> ${location || '—'}</p>
          <p><strong>Claim contact email:</strong> ${contactEmail}</p>
          <p><strong>Message:</strong></p>
          <div style="padding: 12px; background: #f5f5f5; border-radius: 8px;">
            ${message.replace(/\n/g, '<br/>')}
          </div>
          <p style="margin-top: 20px;">
            <a href="${itemUrl}" style="background:#0ea5e9;color:#fff;padding:10px 18px;border-radius:999px;text-decoration:none;font-weight:700;">
              View Item
            </a>
          </p>
        </div>
      `,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to send email.';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}