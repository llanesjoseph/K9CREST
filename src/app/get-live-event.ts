
'use server';

import { collection, getDocs, query, where, Timestamp, limit, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase";

interface LiveEvent {
    id: string;
    name: string;
}

export async function getLiveEvent(): Promise<LiveEvent | null> {
    try {
        const today = new Date();
        const eventsRef = collection(db, "events");

        // Firestore limitation: Cannot have inequality filters on multiple properties.
        // A more robust way that doesn't rely on a composite index is to query 
        // for upcoming or very recent events and filter in code.
        const q = query(
            eventsRef,
            orderBy("startDate", "desc"), // Get most recent first
            limit(20) // Look at the last 20 created events
        );

        const querySnapshot = await getDocs(q);
        
        const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Now, filter for events where the current date falls within the event's date range.
        const currentEvent = events.find(event => {
            // Ensure startDate exists and is a Timestamp before calling toDate()
            if (!event.startDate || typeof event.startDate.toDate !== 'function') {
                return false;
            }
            const startDate = event.startDate.toDate();

            // endDate is optional
            const endDate = event.endDate && typeof event.endDate.toDate === 'function' 
                ? event.endDate.toDate() 
                : null;
            
            // Set time to end of day for comparison
            if (endDate) {
                endDate.setHours(23, 59, 59, 999);
            }

            const now = today;
            // Set start of day for comparison to include the whole start day
            const startDay = new Date(startDate);
            startDay.setHours(0, 0, 0, 0);


            if (endDate) {
                // If there is an end date, make sure we are between start and end.
                return now >= startDay && now <= endDate;
            } else {
                // If there is no end date, check if it's the same day.
                const endOfDay = new Date(startDate);
                endOfDay.setHours(23,59,59,999);

                return now >= startDay && now <= endOfDay;
            }
        });

        if (currentEvent) {
            return { id: currentEvent.id, name: currentEvent.name as string };
        }

        return null;

    } catch (error) {
        console.error("Error fetching live event securely:", error);
        // We throw the error so it can be caught by the caller, but we log it here for server visibility.
        // In a production app, you might want more robust error handling/reporting.
        throw new Error("A server error occurred while checking for live events.");
    }
}
