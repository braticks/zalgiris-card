export const totalSeconds = (entity, sensor = {}, attr = undefined, condition = 'Remaining', now = Date.now()) => {
    const value = attr ?? entity?.state;
    if (value == null || value === '' || ['unknown', 'unavailable'].includes(String(value))) return null;
    const text = String(value).trim();
    if (/^\d{4}-\d{2}-\d{2}T/.test(text)) {
        const timestamp = Date.parse(text);
        if (!Number.isFinite(timestamp)) return null;
        return Math.max(0, (condition === 'Elapsed' ? now - timestamp : timestamp - now) / 1000);
    }
    if (/^\d+:\d{2}(:\d{2}(\.\d+)?)?$/.test(text)) {
        const parts = text.split(':').map(Number);
        return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 3600 + parts[1] * 60;
    }
    const number = Number(text);
    if (!Number.isFinite(number)) return null;
    const unit = String((sensor as any).unit ?? (attr == null ? entity?.attributes?.unit_of_measurement : undefined) ?? 's').toLowerCase();
    const multiplier = ['min', 'm', 'minute', 'minutes'].includes(unit) ? 60 :
        ['h', 'hr', 'hrs', 'hour', 'hours'].includes(unit) ? 3600 : ['ms', 'millisecond', 'milliseconds'].includes(unit) ? .001 :
        ['d', 'day', 'days'].includes(unit) ? 86400 : 1;
    return Math.max(0, number * multiplier);
};
export const durationText = (seconds, showSeconds = true) => {
    if (seconds == null || !Number.isFinite(seconds)) return '—';
    const total = Math.max(0, Math.floor(seconds));
    const d = Math.floor(total / 86400), h = Math.floor(total % 86400 / 3600), m = Math.floor(total % 3600 / 60), s = total % 60;
    return [d ? `${d}d` : '', h ? `${h}h` : '', m ? `${m}m` : '', showSeconds && s ? `${s}s` : ''].filter(Boolean).join(' ') || (showSeconds ? '0s' : '0m');
};
