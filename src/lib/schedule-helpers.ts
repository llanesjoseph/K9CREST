
export const generateTimeSlots = () => {
    const slots = [];
    // 9 AM (inclusive) to 5 PM (exclusive)
    for (let hour = 9; hour < 17; hour++) { 
        for (let minute = 0; minute < 60; minute += 30) {
            const time = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
            slots.push(time);
        }
    }
    return slots;
};
