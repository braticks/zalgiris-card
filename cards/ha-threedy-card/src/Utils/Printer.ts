import { getEntity } from './HomeAssistant';
export const sensorValue = (hass, sensor) => {
    const entity = sensor ? getEntity(hass, sensor.entity) : undefined;
    return sensor?.attribute ? entity?.attributes?.[sensor.attribute] : entity?.state;
};
export const printerState = (hass, config) => String(sensorValue(hass, config.sensors?.Status) ??
    getEntity(hass, `${config.base_entity}${config.use_mqtt ? '_print_status' : '_current_state'}`)?.state ?? 'unknown');
export const isPrinting = (state, config = {}) =>
    ((config as any).printing_states ?? ['printing', 'printing from sd', 'running', 'resuming'])
        .some(value => String(value).toLowerCase() === String(state).toLowerCase());
export const progressValue = (hass, config) => {
    const raw = sensorValue(hass, config.sensors?.Progress ?? config.sensors?.progress) ??
        getEntity(hass, `${config.base_entity}${config.use_mqtt ? '_print_progress' : '_job_percentage'}`)?.state;
    const value = Number(raw);
    return Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
};
export const contentHidden = (state, config, override) => {
    const lower = String(state).toLowerCase();
    if (config.states_hide?.some(v => String(v).toLowerCase() === lower)) return true;
    if (config.states_show?.some(v => String(v).toLowerCase() === lower)) return false;
    return !config.always_show && !override && !isPrinting(state, config);
};
export const safeScale = value => {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? Math.min(1, number) : 1;
};
