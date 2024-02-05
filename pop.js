//lib
import { useCallback, useMemo, useState, useRef } from 'react';
import { Graphics } from '@pixi/react';

//hooks
import { useRegisterNode } from '../hooks/useRegisterNode';
import { useDragDrop } from '../hooks/useDragDrop';

//types
import type { ReactElement } from 'react';
import type { CircleProps } from './types';
import type { Graphics as GraphicsType } from 'pixi.js-legacy';

export const Circle = (props: CircleProps): ReactElement => {
    const [displayObject, setDisplayObject] = useState < Spr.Null < GraphicsType >> (null);
    const {
        x,
        y,
        id,
        width,
        height,
        backgroundColor,
        interactive = false,
        selected = false,
        rotation = 0,
        onChange,
    } = props;

    const nodeIdRef = useRef < string > (id || crypto.randomUUID());

    const draw = useCallback(
        g => {
            g.clear();
            g.beginFill(backgroundColor);
            if (width === height) {
                g.drawCircle(width / 2, width / 2, width / 2);
            } else {
                g.drawEllipse(width / 2, height / 2, width / 2, height / 2);
            }
            g.endFill();
            g.position.x = x;
            g.position.y = y;
        },
        [backgroundColor, height, width, x, y]
    );

    const nodeConfig = useMemo(
        () => ({
            attrs: {
                x,
                y,
                width,
                height,
                rotation,
            },
            displayObject,
            onChange,
        }),
        [x, y, width, height, rotation, displayObject, onChange]
    );

    useRegisterNode({ nodeId: nodeIdRef.current, nodeConfig, selected });
    useDragDrop({ nodeId: nodeIdRef.current });

    return <Graphics ref={setDisplayObject} draw={draw} eventMode={interactive ? 'static' : 'none'} />;
};