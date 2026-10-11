import React, {useEffect, useState} from 'react';
import moment from 'moment';
import Stat from './Stat';
import { totalSeconds, durationText } from '../../Utils/Time';
import { isPrinting } from '../../Utils/Printer';
const TimeStat = ({timeEntity, name, condition, config, direction, status, attr}) => {
    const sensor = config.sensors?.[condition] ?? {};
    const [tick, setTick] = useState(Date.now());
    const active = isPrinting(status, config);
    useEffect(() => {
        if (!active) return;
        const id = setInterval(() => setTick(Date.now()), 1000);
        return () => clearInterval(id);
    }, [active]);
    let time = totalSeconds(timeEntity, sensor, attr, condition, tick);
    // Duration sensors are authoritative snapshots; timestamp sensors already track the clock.
    if (time != null && sensor.interpolate && !/^\d{4}-/.test(String(attr ?? timeEntity?.state))) {
        const updated = Date.parse(timeEntity?.last_updated);
        if (active && Number.isFinite(updated)) time = Math.max(0, time + (condition === 'ETA' ? -1 : direction) * Math.max(0, (tick - updated) / 1000));
    }
    const raw = attr ?? timeEntity?.state;
    let value = '—';
    if (time != null) {
        if (condition === 'ETA') {
            const date = /^\d{4}-\d{2}-\d{2}T/.test(String(raw)) ? moment(raw) : moment(tick).add(time, 'seconds');
            value = date.format(config.use_24hr ? 'HH:mm' : 'h:mm a');
        } else value = config.round_time ? moment.duration(time, 'seconds').humanize() : durationText(time, config.show_seconds !== false);
    }
    return <Stat name={name || condition} value={value} />;
};
export default TimeStat;
