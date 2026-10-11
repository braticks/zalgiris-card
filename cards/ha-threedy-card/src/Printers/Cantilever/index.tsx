import { printerState, isPrinting, progressValue, safeScale } from '../../Utils/Printer';
import { motion, animate, useMotionValue } from 'framer-motion';
import React, { useContext, useState, useEffect } from 'react';
import useDimensions from 'react-cool-dimensions'
import ThreedyContext from '../../Contexts/ThreedyContext';

import styles from './styles';
import getDimensions from './utils';
import { ThreedyCondition } from '../../types';

const Cantilever = ({ printerConfig }) => {

    const {
        hass,
        config
    } = useContext(ThreedyContext);

    const [dimensions, setDimensions] = useState(undefined);

    const { ref } = useDimensions({
        onResize: ({ width, height}) => {
            setDimensions(
                getDimensions(
                    printerConfig,
                    { width, height },
                    safeScale(config.scale)
                )
            )
        },
    });
    const printing = isPrinting(printerState(hass, config), config);
    const progress = progressValue(hass, config) / 100;

    const x = useMotionValue(0);

    useEffect(() => {

        if (dimensions && printing) {
            const animation = animate(x, dimensions.BuildPlate.width, {
                duration: 2,
                repeat: Infinity,
                repeatType: 'reverse',
                ease: 'linear'
            });
            return () => animation.stop();
        }

    }, [dimensions, printing, x])

    return (
        <div style={{ ...styles.Cantilever }} ref={ref}>

            {
                dimensions ? (
                    <div style={{ ...styles.Scalable, ...dimensions.Scalable }}>

                        <div style={{ ...styles.ZAxis, ...dimensions.ZAxis }} />
                        <div style={{ ...styles.Bottom, ...dimensions.Bottom }} />


                        <div style={{ ...styles.BuildPlate, ...dimensions.BuildPlate }} />

                        <div style={{ ...styles.BuildArea, ...dimensions.BuildArea }}>
                            <div style={{ ...styles.Print, height: `${progress * 100}%` }} />

                        </div>

                        <motion.div
                            animate={{ y: -1 * progress * dimensions.BuildArea.height }}
                            style={{ ...styles.XAxis, ...dimensions.XAxis }}
                        />


                        <motion.div
                            animate={{ y: -1 * progress * dimensions.BuildArea.height }}
                            style={{ ...styles.Gantry, ...dimensions.Gantry, x }}
                        >
                            <div style={{ ...styles.Nozzle, ...dimensions.Nozzle }} />
                        </motion.div>

                    </div>
                ) : (null)
            }

        </div>

    )

}

export default Cantilever;
