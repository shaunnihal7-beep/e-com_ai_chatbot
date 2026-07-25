import "server-only";
import { Client } from "@hubspot/api-client";

/**
 * Shared, pre-authenticated HubSpot CRM client.
 *
 * The `server-only` import above guarantees this file can never be bundled into
 * client code — if it ever is, the build fails. That matters because the access
 * token is a real secret: anything that reaches the browser is public.
 *
 * The token is a HubSpot Private App access token (`pat-...`), read from
 * HUBSPOT_API_KEY in .env.local. It is sent as a Bearer token on every request,
 * so the rest of the app never deals with authentication — just import
 * `hubspotClient` and call the CRM APIs.
 */

const accessToken = process.env.HUBSPOT_API_KEY;

if (!accessToken) {
  throw new Error(
    "HUBSPOT_API_KEY is not set. Add your HubSpot Private App token to .env.local.",
  );
}

export const hubspotClient = new Client({ accessToken });

/**
 * Upsert a contact into HubSpot CRM.
 *
 * Called after a user is saved to our own database. HubSpot wants first/last
 * name split out, so we split the single `name` field on the first space.
 *
 * If the contact already exists (HubSpot 409), we treat that as success rather
 * than an error — re-registering the same email should not blow up.
 */
export async function createContact(input: {
  email: string;
  name: string;
  phone?: string;
}) {
  const [firstname, ...rest] = input.name.trim().split(/\s+/);
  const lastname = rest.join(" ");

  // HubSpot rejects empty-string properties less gracefully than omitted ones,
  // so only include `phone` when we actually have a value.
  const properties: Record<string, string> = {
    email: input.email,
    firstname: firstname ?? "",
    lastname,
  };
  if (input.phone?.trim()) {
    properties.phone = input.phone.trim();
  }

  try {
    return await hubspotClient.crm.contacts.basicApi.create({
      properties,
      associations: [],
    });
  } catch (err: unknown) {
    // HubSpot throws with a `code` of 409 when the contact already exists.
    if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 409) {
      return null;
    }
    throw err;
  }
}

/**
 * After a purchase, push the customer's lifetime stats onto their HubSpot
 * contact (Step 12). Upserts by email — updates the existing contact, or
 * creates one if it somehow doesn't exist yet.
 *
 * These map to CUSTOM HubSpot properties you must create first (Step 13):
 *   - total_orders        (Number)
 *   - lifetime_spend      (Number)   — sent in main currency units, not cents
 *   - last_purchase_date  (Date)     — HubSpot expects "YYYY-MM-DD"
 */
export async function syncContactOrderStats(input: {
  email: string;
  totalOrders: number;
  lifetimeSpendCents: number;
  lastPurchaseDate: Date | string | null;
}) {
  const properties: Record<string, string> = {
    total_orders: String(input.totalOrders),
    lifetime_spend: (input.lifetimeSpendCents / 100).toFixed(2),
    // A completed purchase clears any earlier abandoned-cart flag.
    cart_abandoned: "No",
  };
  if (input.lastPurchaseDate) {
    // Postgres returns aggregate timestamps as strings, so coerce to Date.
    const d =
      input.lastPurchaseDate instanceof Date
        ? input.lastPurchaseDate
        : new Date(input.lastPurchaseDate);
    properties.last_purchase_date = d.toISOString().slice(0, 10);
  }

  const result = await hubspotClient.crm.contacts.batchApi.upsert({
    inputs: [{ idProperty: "email", id: input.email, properties }],
  });
  // Return the contact's internal id so the caller can associate a deal with
  // it directly — avoids a follow-up read (which needs a separate scope).
  return result.results[0]?.id;
}

/**
 * Resolve the default deal pipeline's "won" stage id.
 *
 * Stage ids are account-specific (some portals use "closedwon", others use
 * numeric ids), so we can't hardcode them. We read the pipeline once, pick the
 * stage flagged as won (probability 1.0 / closed), and cache the result. Cached
 * as a promise so concurrent checkouts share a single API call.
 */
let wonStagePromise: Promise<string | undefined> | undefined;

function resolveWonStage(): Promise<string | undefined> {
  wonStagePromise ??= (async () => {
    try {
      const pipeline = await hubspotClient.crm.pipelines.pipelinesApi.getById("deals", "default");
      const stages = pipeline.stages ?? [];
      // Prefer a stage literally labelled "won" (e.g. "Closed Won"); fall back
      // to any closed/100%-probability stage, then to the last stage.
      const won =
        stages.find((s) => /won/i.test(s.label)) ??
        stages.find((s) => s.metadata?.probability === "1.0") ??
        stages.find((s) => s.metadata?.isClosed === "true") ??
        stages[stages.length - 1];
      return won?.id;
    } catch {
      // If the lookup fails, we fall back to letting HubSpot pick a stage.
      return undefined;
    }
  })();
  return wonStagePromise;
}

/**
 * Record a purchase as a HubSpot Deal (Step 14) and associate it with the
 * buyer's contact. For a demo, Deals on the default pipeline are plenty — no
 * custom objects needed.
 *
 * The deal is opened in the default pipeline's "won" stage, since the order is
 * already paid. If that stage can't be resolved, the deal is still created and
 * HubSpot assigns a default stage. Association type 3 is HubSpot's built-in
 * deal→contact relationship.
 */
export async function createDeal(input: {
  orderNumber: string;
  amountCents: number;
  /**
   * The buyer's HubSpot contact id, to link the deal to them. Pass the id
   * returned by `syncContactOrderStats` — that avoids a contact read (which
   * needs a separate scope). If omitted, the deal is created unassociated.
   */
  contactId?: string;
}) {
  const contactId = input.contactId;

  const dealstage = await resolveWonStage();
  const properties: Record<string, string> = {
    dealname: `Order ${input.orderNumber}`,
    amount: (input.amountCents / 100).toFixed(2),
    pipeline: "default",
  };
  if (dealstage) {
    properties.dealstage = dealstage;
  }

  return hubspotClient.crm.deals.basicApi.create({
    properties,
    associations: contactId
      ? [
          {
            to: { id: contactId },
            types: [
              {
                associationCategory: "HUBSPOT_DEFINED" as never,
                associationTypeId: 3,
              },
            ],
          },
        ]
      : [],
  });
}

/**
 * Newsletter signup (Step 20). Upserts the contact and flags them as a
 * subscriber. A HubSpot Active List filtered on `newsletter_subscribed = Yes`
 * becomes the marketing list — built in the HubSpot UI, no code needed.
 */
export async function subscribeNewsletter(email: string) {
  return hubspotClient.crm.contacts.batchApi.upsert({
    inputs: [
      {
        idProperty: "email",
        id: email,
        properties: { email, newsletter_subscribed: "Yes" },
      },
    ],
  });
}

/**
 * Flag a contact's cart as abandoned / active (Step 18). Upserts by email so a
 * known-but-not-yet-created contact still gets the flag. A HubSpot Workflow can
 * then watch `cart_abandoned = Yes` and send a reminder email — that part is
 * configured in the HubSpot UI, not here.
 */
export async function setCartAbandoned(email: string, abandoned: boolean) {
  return hubspotClient.crm.contacts.batchApi.upsert({
    inputs: [
      {
        idProperty: "email",
        id: email,
        properties: { cart_abandoned: abandoned ? "Yes" : "No" },
      },
    ],
  });
}

/**
 * Resolve the default ticket pipeline's first stage id (e.g. "New").
 * Ticket stage ids are account-specific like deal stages, so we look them up
 * once and cache. Tickets require a pipeline + stage on create.
 */
let ticketStagePromise: Promise<{ pipeline: string; stage: string } | undefined> | undefined;

function resolveTicketStage() {
  ticketStagePromise ??= (async () => {
    try {
      const res = await hubspotClient.crm.pipelines.pipelinesApi.getAll("tickets");
      const pipeline = res.results?.[0];
      const stages = [...(pipeline?.stages ?? [])].sort(
        (a, b) => (a.displayOrder ?? 0) - (b.displayOrder ?? 0),
      );
      if (!pipeline || stages.length === 0) return undefined;
      return { pipeline: pipeline.id, stage: stages[0].id };
    } catch {
      return undefined;
    }
  })();
  return ticketStagePromise;
}

/**
 * Create a support Ticket from a contact-form submission (Step 19) and link it
 * to the sender's contact. The contact is upserted first (write scope only) so
 * we get an id to associate — association type 16 is ticket→contact.
 */
export async function createTicket(input: {
  email: string;
  name: string;
  subject: string;
  message: string;
}) {
  // Upsert the contact so the ticket has someone to attach to.
  const [firstname, ...rest] = input.name.trim().split(/\s+/);
  const upsert = await hubspotClient.crm.contacts.batchApi.upsert({
    inputs: [
      {
        idProperty: "email",
        id: input.email,
        properties: { email: input.email, firstname: firstname ?? "", lastname: rest.join(" ") },
      },
    ],
  });
  const contactId = upsert.results[0]?.id;

  const stage = await resolveTicketStage();
  const properties: Record<string, string> = {
    subject: input.subject,
    content: `${input.message}\n\n— ${input.name} <${input.email}>`,
  };
  if (stage) {
    properties.hs_pipeline = stage.pipeline;
    properties.hs_pipeline_stage = stage.stage;
  }

  return hubspotClient.crm.tickets.basicApi.create({
    properties,
    associations: contactId
      ? [
          {
            to: { id: contactId },
            types: [
              { associationCategory: "HUBSPOT_DEFINED" as never, associationTypeId: 16 },
            ],
          },
        ]
      : [],
  });
}

/**
 * Fallback for Step 19 when Tickets (Service Hub) aren't available on the
 * account: capture the enquiry onto the CONTACT instead. Upserts by email and
 * records the latest subject/message in custom properties.
 */
export async function createEnquiryContact(input: {
  email: string;
  name: string;
  subject: string;
  message: string;
}) {
  const [firstname, ...rest] = input.name.trim().split(/\s+/);
  return hubspotClient.crm.contacts.batchApi.upsert({
    inputs: [
      {
        idProperty: "email",
        id: input.email,
        properties: {
          email: input.email,
          firstname: firstname ?? "",
          lastname: rest.join(" "),
          last_enquiry_subject: input.subject,
          last_enquiry_message: input.message,
        },
      },
    ],
  });
}

/**
 * Step 19 entry point. Prefers a support Ticket; if the account can't create
 * tickets (no Service Hub / missing scope), falls back to recording the
 * enquiry on the contact. Returns which path was used, for logging/UX.
 */
export async function submitEnquiry(input: {
  email: string;
  name: string;
  subject: string;
  message: string;
}): Promise<"ticket" | "contact"> {
  try {
    await createTicket(input);
    return "ticket";
  } catch {
    await createEnquiryContact(input);
    return "contact";
  }
}
