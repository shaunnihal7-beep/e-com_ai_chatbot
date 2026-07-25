/**
 * Step 13 — create the custom HubSpot contact properties the CRM sync writes to.
 *
 * The tutorial does this by hand in Settings → Properties. This script does the
 * same thing programmatically so it's repeatable and documents exactly which
 * properties app code depends on. Safe to re-run: properties that already exist
 * are skipped (HubSpot returns 409).
 *
 * Run with:  npm run hubspot:setup
 */
import { config } from "dotenv";
import { Client } from "@hubspot/api-client";
import {
  PropertyCreateTypeEnum,
  PropertyCreateFieldTypeEnum,
} from "@hubspot/api-client/lib/codegen/crm/properties/models/PropertyCreate";

// Next reads .env.local on its own; a plain tsx script does not.
config({ path: ".env.local" });

const token = process.env.HUBSPOT_API_KEY;
if (!token) {
  console.error("HUBSPOT_API_KEY is not set in .env.local");
  process.exit(1);
}

const hubspot = new Client({ accessToken: token });

// `type`/`fieldType` follow HubSpot's property model. `groupName`
// "contactinformation" places them under the default contact info section.
const properties = [
  {
    name: "total_orders",
    label: "Total Orders",
    type: PropertyCreateTypeEnum.Number,
    fieldType: PropertyCreateFieldTypeEnum.Number,
    groupName: "contactinformation",
  },
  {
    name: "lifetime_spend",
    label: "Lifetime Spend",
    type: PropertyCreateTypeEnum.Number,
    fieldType: PropertyCreateFieldTypeEnum.Number,
    groupName: "contactinformation",
  },
  {
    name: "last_purchase_date",
    label: "Last Purchase Date",
    type: PropertyCreateTypeEnum.Date,
    fieldType: PropertyCreateFieldTypeEnum.Date,
    groupName: "contactinformation",
  },
  {
    name: "customer_tier",
    label: "Customer Tier",
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Select,
    groupName: "contactinformation",
    options: [
      { label: "Standard", value: "standard", displayOrder: 0, hidden: false },
      { label: "VIP", value: "vip", displayOrder: 1, hidden: false },
    ],
  },
  {
    name: "cart_abandoned",
    label: "Cart Abandoned",
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Select,
    groupName: "contactinformation",
    options: [
      { label: "No", value: "No", displayOrder: 0, hidden: false },
      { label: "Yes", value: "Yes", displayOrder: 1, hidden: false },
    ],
  },
  {
    name: "newsletter_subscribed",
    label: "Newsletter Subscribed",
    type: PropertyCreateTypeEnum.Enumeration,
    fieldType: PropertyCreateFieldTypeEnum.Select,
    groupName: "contactinformation",
    options: [
      { label: "No", value: "No", displayOrder: 0, hidden: false },
      { label: "Yes", value: "Yes", displayOrder: 1, hidden: false },
    ],
  },
  {
    name: "last_enquiry_subject",
    label: "Last Enquiry Subject",
    type: PropertyCreateTypeEnum.String,
    fieldType: PropertyCreateFieldTypeEnum.Text,
    groupName: "contactinformation",
  },
  {
    name: "last_enquiry_message",
    label: "Last Enquiry Message",
    type: PropertyCreateTypeEnum.String,
    fieldType: PropertyCreateFieldTypeEnum.Textarea,
    groupName: "contactinformation",
  },
];

async function main() {
  for (const prop of properties) {
    try {
      await hubspot.crm.properties.coreApi.create("contacts", prop);
      console.log(`created  ${prop.name}`);
    } catch (err: unknown) {
      if (typeof err === "object" && err !== null && "code" in err && (err as { code: number }).code === 409) {
        console.log(`exists   ${prop.name} (skipped)`);
      } else {
        throw err;
      }
    }
  }
  console.log("Done.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
