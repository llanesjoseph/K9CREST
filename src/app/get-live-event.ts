
'use server';

import { collection, getDocs, query } from "firebase/firestore";
import { adminDb } from "@/lib/firebase-admin";

interface LiveEvent {
    id: string;
    name: string;
}

export async function getLiveEvent(): Promise<LiveEvent | null> {
    try {
        const today = new Date();
        const eventsRef = collection(adminDb, "events");

        // A simple query to get all documents from the events collection.
        // This avoids needing any specific indexes on the Firestore database.
        const q = query(eventsRef);

        const querySnapshot = await getDocs(q);
        
        const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Now, filter in code for events where the current date falls within the event's date range.
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
        // Instead of throwing an error, we'll return null to prevent a server crash.
        // The frontend will handle the null case gracefully.
        return null;
    }
}
