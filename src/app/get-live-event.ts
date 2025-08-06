
'use server';

import { collection, getDocs, query, where, Timestamp, limit } from "firebase/firestore";
import { db } from "@/lib/firebase"; // Using the admin-initialized instance

interface LiveEvent {
    id: string;
    name: string;
}

export async function getLiveEvent(): Promise<LiveEvent | null> {
    try {
        const today = Timestamp.now();
        const eventsRef = collection(db, "events");

        // Query for events that have started and are not in the future.
        const q = query(
            eventsRef, 
            where("startDate", "<=", today),
            limit(10) // Limit to a reasonable number to filter on the server
        );

        const querySnapshot = await getDocs(q);
        
        const events = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        // Now, filter for events where the end date is also valid.
        // This is necessary because Firestore doesn't allow two inequality filters on different fields.
        const currentEvent = events.find(event => {
            const startDate = event.startDate.toDate();
            const endDate = event.endDate?.toDate();
            const now = new Date();

            if (endDate) {
                // If there is an end date, make sure we are between start and end.
                return now >= startDate && now <= endDate;
            } else {
                // If there is no end date, check if it's the same day.
                return now.toDateString() === startDate.toDateString();
            }
        });

        if (currentEvent) {
            return { id: currentEvent.id, name: currentEvent.name };
        }

        return null;

    } catch (error) {
        console.error("Error fetching live event securely:", error);
        // We throw the error so it can be caught by the caller, but we log it here for server visibility.
        // In a production app, you might want more robust error handling/reporting.
        throw new Error("A server error occurred while checking for live events.");
    }
}
