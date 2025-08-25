/**
 * Generate a list of time slots for scheduling.
 *
 * Validates that the start and end times are in `HH:mm` format, the duration is
 * positive, and the start precedes the end.  Optionally skips slots during a
 * lunch break.
 */
interface GenerateTimeSlotsParams {
    duration?: number; // in minutes
    eventStartTime?: string | null; // HH:mm
    eventEndTime?: string | null; // HH:mm
    lunchBreak?: {
        start: string; // HH:mm
        end: string;   // HH:mm
    } | null;
}

const parseTimeToMinutes = (time: string): number => {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
}

export const generateTimeSlots = ({ duration = 30, lunchBreak = null, eventStartTime = '09:00', eventEndTime = '17:00' }: GenerateTimeSlotsParams = {}) => {
    const timeRegex = /^\d{2}:\d{2}$/;
    if (duration <= 0) throw new Error('duration must be greater than 0');
    if (!timeRegex.test(eventStartTime) || !timeRegex.test(eventEndTime)) {
        throw new Error('eventStartTime and eventEndTime must be in HH:mm format');
    }
    if (lunchBreak) {
        if (!timeRegex.test(lunchBreak.start) || !timeRegex.test(lunchBreak.end)) {
            throw new Error('lunchBreak start/end must be in HH:mm format');
        }
    }
    const startTime = eventStartTime ? parseTimeToMinutes(eventStartTime) : 9 * 60; // 9 AM in minutes
    const endTime = eventEndTime ? parseTimeToMinutes(eventEndTime) : 17 * 60;  // 5 PM in minutes
    if (startTime >= endTime) throw new Error('eventStartTime must be earlier than eventEndTime');

    const lunchStartMinutes = lunchBreak?.start ? parseTimeToMinutes(lunchBreak.start) : null;
    const lunchEndMinutes = lunchBreak?.end ? parseTimeToMinutes(lunchBreak.end) : null;

    const slots = [] as string[];
    for (let time = startTime; time < endTime; time += duration) {
        if (lunchStartMinutes !== null && lunchEndMinutes !== null) {
            if (time >= lunchStartMinutes && time < lunchEndMinutes) {
                continue; // Skip lunch break slots
            }
        }

        const hour = Math.floor(time / 60);
        const minute = time % 60;
        const formattedTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
        slots.push(formattedTime);
    }

    return slots;
};
