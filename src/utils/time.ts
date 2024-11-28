export function millisToTime(time: number): string {
    const twelveHourClock = getSetting<boolean>('hour24_clock', false);
    const date = new Date(time);
    let hours = date.getHours();
    const minutes = date.getMinutes();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    if (twelveHourClock) {
        hours = hours % 12;
        hours = hours ? hours : 12;
    }
    return `${hours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
}