import React, {useContext} from 'react';
import ThreedyContext from '../../Contexts/ThreedyContext';
import Cantilever from '../../Printers/Cantilever';
import CoreXY from '../../Printers/CoreXY';
import Defaults from '../../Printers/Defaults';
import I3 from '../../Printers/I3';
import styles from './styles';
const PrinterView = ({toggleVideo, hasCamera, style}) => {
    const {config} = useContext(ThreedyContext);
    const Printer = config.printer_type === 'CoreXY' ? CoreXY : config.printer_type === 'Cantilever' ? Cantilever : I3;
    return <div onClick={toggleVideo} style={{...styles.PrinterView, ...style, cursor: hasCamera ? 'pointer' : 'default'}}>
        <Printer printerConfig={config.printer_config || Defaults[config.printer_type] || Defaults.I3}/>
    </div>;
};
export default PrinterView;
