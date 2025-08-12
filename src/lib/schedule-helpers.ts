

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
    const slots = [];
    const startTime = eventStartTime ? parseTimeToMinutes(eventStartTime) : 9 * 60; // 9 AM in minutes
    const endTime = eventEndTime ? parseTimeToMinutes(eventEndTime) : 17 * 60;  // 5 PM in minutes

    const lunchStartMinutes = lunchBreak?.start ? parseTimeToMinutes(lunchBreak.start) : null;
    const lunchEndMinutes = lunchBreak?.end ? parseTimeToMinutes(lunchBreak.end) : null;

    for (let time = startTime; time < endTime; time += duration) {
        if (lunchStartMinutes && lunchEndMinutes) {
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
