import React from 'react';
import TemperatureStat from './TemperatureStat';
import { getEntity } from '../../Utils/HomeAssistant';
import { printerState, progressValue, sensorValue } from '../../Utils/Printer';
import Stat from './Stat';
import TimeStat from './TimeStat';
const renderCondition = (hass, config, condition) => {
    const sensor = config.sensors?.[condition];
    const custom = sensor ? getEntity(hass, sensor.entity) : undefined;
    const attr = sensor?.attribute ? custom?.attributes?.[sensor.attribute] : undefined;
    const entity = suffix => getEntity(hass, `${config.base_entity}${suffix}`);
    const status = printerState(hass, config);
    const name = sensor?.name || condition;
    if (condition === 'Status') return <Stat name={name} value={status}/>;
    if (['ETA', 'Elapsed', 'Remaining'].includes(condition)) {
        const suffix = config.use_mqtt ? (condition === 'Elapsed' ? '_print_time' : '_print_time_left') :
            condition === 'Elapsed' ? '_start_time' : '_estimated_finish_time';
        const legacyAttr = config.use_mqtt && !sensor ? entity('_print_progress')?.attributes?.[condition === 'Elapsed' ? 'printTime' : 'printTimeLeft'] : undefined;
        return <TimeStat name={name} timeEntity={sensor ? custom : entity(suffix)} attr={attr ?? legacyAttr}
            condition={condition} config={config} direction={condition === 'Elapsed' ? 1 : -1} status={status}/>;
    }
    if (['Bed', 'Hotend'].includes(condition)) {
        const suffix = condition === 'Bed' ? (config.use_mqtt ? '_bed_temperature' : '_actual_bed_temp') :
            (config.use_mqtt ? '_tool_0_temperature' : '_actual_tool0_temp');
        return <TemperatureStat name={name} temperatureEntity={sensor ? custom : entity(suffix)} attr={attr} config={config}/>;
    }
    let value = sensorValue(hass, sensor) ?? '—';
    const precisionOption = sensor?.precision ?? (/Minutes$/.test(condition) || ['min', 'minutes'].includes(custom?.attributes?.unit_of_measurement) ? 0 : undefined);
    if (precisionOption != null && value !== '' && Number.isFinite(Number(value))) {
        const precision = Number(precisionOption);
        if (Number.isFinite(precision)) value = Number(value).toFixed(Math.max(0, Math.min(10, Math.trunc(precision))));
    }
    return <Stat name={name} value={value}/>;
};
const renderStats = (hass, config) => (config.monitored ?? []).map(condition =>
    <React.Fragment key={condition}>{renderCondition(hass, config, condition)}</React.Fragment>);
const percentComplete = progressValue;
export {renderStats, percentComplete};
