"use server";

import { z } from "zod";

import { submitEnquiry } from "@/lib/hubspot";

export type ContactState = { error?: string; success?: boolean } | undefined;

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name."),
  email: z.string().email("Please enter a valid email address."),
  subject: z.string().trim().min(3, "Please add a short subject."),
  message: z.string().trim().min(10, "Please tell us a little more (10+ characters)."),
});

/**
 * Contact-form submission (Step 19). Creates a HubSpot support Ticket and
 * associates it with the sender's contact. Unlike checkout, a failed CRM call
 * here IS surfaced — the customer expects their message to be received.
 */
export async function submitContactAction(
  _prev: ContactState,
  formData: FormData,
): Promise<ContactState> {
  const parsed = schema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    subject: formData.get("subject"),
    message: formData.get("message"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  try {
    const mode = await submitEnquiry(parsed.data);
    console.log(`[contact] enquiry captured in HubSpot as: ${mode}`);
  } catch (err) {
    console.error("[contact] HubSpot enquiry failed:", err);
    return { error: "Something went wrong sending your message. Please try again." };
  }

  return { success: true };
}
