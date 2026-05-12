import { ChatOpenAI } from '@langchain/openai';
import { z } from 'zod';
import type { ChatStateAnnotation } from '../chat-state';

const IntentSchema = z.object({
  intent: z.enum([
    'SEARCH_VEHICLES',
    'BOOK_VEHICLE',
    'CHECK_BOOKING',
    'FAQ',
    'GENERAL',
  ]),
  toolKey: z.enum([
    'search_vehicles',
    'nearest_vehicles',
    'best_sellers',
    'create_booking',
    'check_availability',
    'check_bookings',
    'none',
  ]),
  toolInput: z.record(z.string(), z.any()).optional(),
  missingFields: z.array(z.string()).optional().default([]),
  serviceType: z.enum(['self_drive', 'with_driver']).optional(),
});

export type IntentClassification = z.infer<typeof IntentSchema>;

export function createIntentClassifierNode(model: ChatOpenAI) {
  const structured = model.withStructuredOutput(IntentSchema);

  return async (
    state: typeof ChatStateAnnotation.State,
  ): Promise<Partial<typeof ChatStateAnnotation.Update>> => {
    const historyText = state.conversationHistory
      .slice(-8)
      .map((t) => `${t.role}: ${t.content}`)
      .join('\n');

    const prompt = `You route messages for CarLo, a car rental platform in Pakistan.
Classify the latest user intent and propose tool parameters as JSON.

Intents:
- SEARCH_VEHICLES: browse, filter, or find cars (city optional).
- BOOK_VEHICLE: user wants to reserve a specific vehicle with dates/locations.
- CHECK_BOOKING: user asks about their existing bookings, status, or history.
- FAQ: questions about policies, payments, documents, platform rules.
- GENERAL: greetings, small talk, or anything else.

toolKey rules:
- SEARCH_VEHICLES → usually search_vehicles; use nearest_vehicles if user stresses "nearest/in my city" with a clear city; use best_sellers for "popular/top/most booked"; use check_availability when user only asks if dates are free for a vehicleId.
- BOOK_VEHICLE → create_booking (extract toolInput fields when possible).
- CHECK_BOOKING → check_bookings.
- FAQ / GENERAL → none.

toolInput hints:
- search_vehicles / nearest_vehicles: { city?, vehicleType?, minSeats?, fuelType?, serviceType? }
- best_sellers: { city?, vehicleType?, serviceType? }
- check_availability: { vehicleId, pickupDate, returnDate } (ISO datetimes)
- create_booking: { vehicleId, pickupDate, returnDate, pickupLocation, returnLocation, serviceType, priceModel? } — when vehicleId is known, omit priceModel from missingFields if unsure; the server fills it from the vehicle's pricingModel.

For BOOK_VEHICLE: list missingFields for any of: vehicleId, pickupDate, returnDate, pickupLocation, returnLocation, serviceType that you cannot infer from the latest message plus recent history. The full required set for BOOK_VEHICLE is: ['vehicleId', 'pickupDate', 'returnDate', 'pickupLocation', 'returnLocation', 'serviceType']. Only include priceModel in missingFields when vehicleId is unknown or you cannot tie the request to a specific listing.

userEmail is supplied separately by the app — do NOT put userEmail in toolInput.

SERVICE TYPE EXTRACTION:

If user mentions "self drive", "khud chalana", "apni marzi", "without driver",
"no driver", "drive myself" → set serviceType = "self_drive"
If user mentions "with driver", "driver chahiye", "driver ke saath",
"driver included", "chauffeur" → set serviceType = "with_driver"
If user does not mention either → omit serviceType entirely (do not guess)
Always pass extracted serviceType into toolInput as well

BOOKING INTENT — missingFields rules:

vehicleId is missing if user has not confirmed a specific car by id
pickupDate is missing if no date/time mentioned
returnDate is missing if no return date/time mentioned
pickupLocation is missing if no pickup address/area mentioned
returnLocation is missing if no drop-off address/area mentioned
serviceType is missing if user has NOT mentioned self-drive or with-driver
(this is now REQUIRED for booking — always include in missingFields if absent)
priceModel: do NOT add to missingFields (server fills from vehicle)

Conversation:
${historyText}

Latest user message:
${state.userMessage}
`;

    try {
      const parsed = await structured.invoke(prompt);
      const missingFields = parsed.missingFields ?? [];
      const toolInput: Record<string, unknown> = {
        ...(parsed.toolInput ?? {}),
        ...(parsed.serviceType ? { serviceType: parsed.serviceType } : {}),
      };
      if (!String(toolInput.city ?? '').trim() && state.userCity) {
        toolInput.city = state.userCity;
      }
      const isBookingIncomplete =
        parsed.intent === 'BOOK_VEHICLE' && missingFields.length > 0;

      return {
        intent: parsed.intent as string,
        toolKey: parsed.toolKey as string,
        toolInput,
        missingFields,
        toolOutput: isBookingIncomplete
          ? { type: 'MISSING_INFO', missingFields }
          : undefined,
      };
    } catch {
      return {
        intent: 'GENERAL',
        toolKey: 'none',
        toolInput: {},
        missingFields: [],
        toolOutput: undefined,
      };
    }
  };
}
