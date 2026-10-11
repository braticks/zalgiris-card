import React, {useContext} from 'react';
import ReactPlayer from 'react-player'

import { motion } from 'framer-motion';

import styles from './styles'
import useDimensions from "react-cool-dimensions";
import ThreedyContext from '../../Contexts/ThreedyContext';


const Camera = ({ visible, toggleVideo, cameraEntity }) => {

    const { config } = useContext(ThreedyContext);
    
    const { ref, width, height, entry, unobserve, observe } = useDimensions();


    const isMJPG = !!cameraEntity && !!cameraEntity.attributes.access_token;

    return (
        <motion.div
            animate={{
                scale: visible ? 1.0 : 0.0,
                opacity: visible ? 1.0 : 0.0
            }}
            transition={{
                duration: 0.15,
                ease: 'easeInOut'
            }}
            ref={ref}
            style={{ ...styles.CameraRoot }}
        >
            <div
                style={{
                    ...styles.Wrapper,
                    background:
                        visible && isMJPG && !!cameraEntity ?
                            `url('${cameraEntity.test ?
                                cameraEntity.testUrl : `${window.location.origin}/api/camera_proxy_stream/${cameraEntity.entity_id}?token=${cameraEntity.attributes.access_token}`}')`

                            : 'none',
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    transform: config.camera_rotate == true && config.camera_mirror == true ? `rotate(180deg) scaleX(-1)` :
                    config.camera_rotate == true ? `rotate(180deg)` : config.camera_mirror == true ? `scaleX(-1)` : ``
                }}
                onClick={toggleVideo}
            >
                {

                    /* TODO: Implement M3U8 Streams. Though, needed? */
                    visible && !isMJPG ? (
                        <ReactPlayer
                            width={width}
                            height={height}
                            url={cameraEntity.attributes.entity_picture}
                            muted
                            playing
                            config={{
                                file: {
                                    attributes: {
                                        style: {
                                            width: "100%",
                                            height: "100%",
                                            objectFit: "cover",
                                        },
                                    },
                                },
                            }}

                        >
                        </ReactPlayer>
                    ) : (null)

                }

            </div>
        </motion.div>
    )

};

export default Camera;
