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
- best_sellers: { city?, vehicleType? }
- check_availability: { vehicleId, pickupDate, returnDate } (ISO datetimes)
- create_booking: { vehicleId, pickupDate, returnDate, pickupLocation, returnLocation, serviceType, priceModel? } — when vehicleId is known, omit priceModel from missingFields if unsure; the server fills it from the vehicle's pricingModel.

For BOOK_VEHICLE: list missingFields for any of: vehicleId, pickupDate, returnDate, pickupLocation, returnLocation, serviceType that you cannot infer from the latest message plus recent history. Only include priceModel in missingFields when vehicleId is unknown or you cannot tie the request to a specific listing.

userEmail is supplied separately by the app — do NOT put userEmail in toolInput.

Conversation:
${historyText}

Latest user message:
${state.userMessage}
`;

    try {
      const parsed = await structured.invoke(prompt);
      const missingFields = parsed.missingFields ?? [];
      const toolInput = parsed.toolInput ?? {};
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
