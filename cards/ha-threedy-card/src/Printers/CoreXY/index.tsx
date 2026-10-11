import React, {useContext} from 'react';
import ThreedyContext from '../../Contexts/ThreedyContext';
import { isPrinting, printerState, progressValue, safeScale } from '../../Utils/Printer';
const CoreXY = () => {
    const {hass, config} = useContext(ThreedyContext);
    const active = isPrinting(printerState(hass, config), config);
    const progress = progressValue(hass, config);
    const plate = 180 + progress * .35;
    return <svg viewBox="0 0 240 270" width="100%" height="100%" style={{transform: `scale(${safeScale(config.scale)})`}} role="img" aria-label="CoreXY printer">
        <style>{`@keyframes threedy-corexy-head {from {transform:translateX(0)} to {transform:translateX(110px)}}`}</style>
        <rect x="20" y="15" width="200" height="235" rx="14" fill="#555"/>
        <rect x="34" y="30" width="172" height="190" rx="8" fill="var(--card-background-color, #222)"/>
        <path d="M40 55 H200 M45 58 V218 M195 58 V218" stroke="#888" strokeWidth="6"/>
        <rect x="60" y={plate - progress * .8} width="120" height={progress * .8} rx="4" fill={config.progress_color || 'var(--primary-color, #03a9f4)'}/>
        <rect x="48" y={plate} width="144" height="8" rx="4" fill="#aaa"/>
        <g style={{animation: active ? 'threedy-corexy-head 2s linear infinite alternate' : 'none'}}>
            <rect x="48" y="58" width="34" height="32" rx="5" fill="#ccc"/><path d="M58 90 L65 99 L72 90" fill="#999"/>
        </g>
        <rect x="85" y="233" width="70" height="9" rx="4" fill="#333"/>
    </svg>;
};
export default CoreXY;
