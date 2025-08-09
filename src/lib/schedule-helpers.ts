

interface GenerateTimeSlotsParams {
    duration?: number; // in minutes
    lunchBreak?: {
        start: string; // HH:mm
        end: string;   // HH:mm
    } | null;
}

export const generateTimeSlots = ({ duration = 30, lunchBreak = null }: GenerateTimeSlotsParams = {}) => {
    const slots = [];
    const startTime = 9 * 60; // 9 AM in minutes
    const endTime = 17 * 60;  // 5 PM in minutes

    const lunchStartMinutes = lunchBreak?.start ? parseInt(lunchBreak.start.split(':')[0]) * 60 + parseInt(lunchBreak.start.split(':')[1]) : null;
    const lunchEndMinutes = lunchBreak?.end ? parseInt(lunchBreak.end.split(':')[0]) * 60 + parseInt(lunchBreak.end.split(':')[1]) : null;

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
