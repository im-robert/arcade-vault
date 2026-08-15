import { Resend } from "resend";

export interface ContactRequestBody {
  name: string;
  email: string;
  message: string;
}

export interface ContactSuccessResponse {
  ok: true;
}

export interface ContactErrorResponse {
  ok: false;
  error: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function errorResponse(error: string, status: number) {
  return Response.json({ ok: false, error } satisfies ContactErrorResponse, {
    status,
  });
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export async function POST(request: Request) {
  let body: Partial<ContactRequestBody>;

  try {
    body = await request.json();
  } catch {
    return errorResponse("El formato de la solicitud no es válido.", 400);
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const message = typeof body.message === "string" ? body.message.trim() : "";

  if (!name || !email || !message) {
    return errorResponse("Nombre, correo y mensaje son obligatorios.", 400);
  }

  if (!EMAIL_RE.test(email)) {
    return errorResponse("El correo electrónico no tiene un formato válido.", 400);
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO_EMAIL;
  const from = process.env.CONTACT_FROM_EMAIL;

  if (!apiKey || !to || !from) {
    console.error(
      "[contact] Faltan variables de entorno: RESEND_API_KEY, CONTACT_TO_EMAIL o CONTACT_FROM_EMAIL."
    );
    return errorResponse("No se pudo enviar el mensaje. Inténtalo más tarde.", 500);
  }

  const resend = new Resend(apiKey);

  try {
    const { error } = await resend.emails.send({
      from,
      to,
      replyTo: email,
      subject: `Arcade Vault — nuevo mensaje de ${name}`,
      text: `Nombre: ${name}\nCorreo: ${email}\n\nMensaje:\n${message}`,
      html: `
        <h2>Nuevo mensaje desde Arcade Vault</h2>
        <p><strong>Nombre:</strong> ${escapeHtml(name)}</p>
        <p><strong>Correo:</strong> ${escapeHtml(email)}</p>
        <p><strong>Mensaje:</strong></p>
        <p style="white-space: pre-wrap">${escapeHtml(message)}</p>
      `,
    });

    if (error) {
      console.error("[contact] Resend devolvió un error:", error);
      return errorResponse("No se pudo enviar el mensaje. Inténtalo más tarde.", 500);
    }
  } catch (err) {
    console.error("[contact] Falló el envío con Resend:", err);
    return errorResponse("No se pudo enviar el mensaje. Inténtalo más tarde.", 500);
  }

  return Response.json({ ok: true } satisfies ContactSuccessResponse);
}
