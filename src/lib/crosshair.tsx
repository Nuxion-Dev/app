import { JSX } from "react";

export type CrosshairProps = {
    className?: string;
    style?: React.CSSProperties;
}

export interface CrosshairItem {
    id: string;
    content: (props: CrosshairProps) => JSX.Element;
}

export const defaultCrosshairs: CrosshairItem[] = [
    {
        id: 'svg1',
        content: ({ className, style }) => (
            <svg height="41px" width="41px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 474.27 474.27" className={className} style={style}>
                <g><g>
                    <path d="M237.135,474.27c130.968,0,237.135-106.167,237.135-237.135S368.103,0,237.135,0 S0,106.167,0,237.135S106.167,474.27,237.135,474.27z M60.639,200.556C75.197,130.212,130.87,74.742,201.32,60.485v65.557h73.157 V60.81c69.727,14.753,124.7,69.914,139.161,139.746h-66.167v73.157h66.167c-14.453,69.833-69.434,124.993-139.161,139.746v-65.232 H201.32v65.557c-70.45-14.266-126.123-69.727-140.681-140.072h66.167v-73.157H60.639z"/>
                    <circle cx="239.842" cy="237.135" r="18.964"/>
                </g></g>
            </svg>
        )
    },
    {
        id: 'svg2',
        content: ({ className, style }) => (
            <svg height="41px" width="41px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 334.312 334.312" className={className} style={style}>
                <g><g>
                    <circle cx="167.156" cy="167.155" r="13.921"/>
                    <path d="M110.483,135.793c3.497,3.491,8.079,5.239,12.656,5.239s9.159-1.748,12.656-5.245 c6.993-6.987,6.993-18.324,0-25.317L30.556,5.244c-6.993-6.987-18.318-6.987-25.311,0s-6.993,18.324,0,25.317L110.483,135.793z"/>
                    <path d="M211.173,141.038c4.583,0,9.159-1.748,12.656-5.239L329.067,30.561 c6.993-6.993,6.993-18.324,0-25.317c-6.993-6.993-18.318-6.987-25.311,0L198.518,110.475c-6.993,6.993-6.993,18.324,0,25.317 C202.014,139.289,206.591,141.038,211.173,141.038z"/>
                    <path d="M303.755,329.066c3.497,3.491,8.079,5.239,12.656,5.239s9.159-1.748,12.656-5.245 c6.993-6.987,6.993-18.324,0-25.317L223.829,198.517c-6.993-6.987-18.318-6.987-25.311,0s-6.993,18.324,0,25.317L303.755,329.066z"/>
                    <path d="M17.901,334.311c4.583,0,9.159-1.748,12.656-5.239L135.794,223.84 c6.993-6.993,6.993-18.324,0-25.317s-18.318-6.987-25.311,0L5.245,303.748c-6.993,6.993-6.993,18.324,0,25.317 C8.741,332.562,13.324,334.311,17.901,334.311z"/>
                </g></g>
            </svg>
        )
    },
    {
        id: 'svg3',
        content: ({ className, style }) => (
            <svg height="41px" width="41px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 358.012 358.012" className={className} style={style}>
                <g><g>
                    <polygon points="274.303,52.983 274.303,88.784 322.211,88.784 322.211,269.228 274.303,269.228 274.303,305.029 358.012,305.029 358.012,52.983"/>
                    <polygon points="35.801,88.784 83.709,88.784 83.709,52.983 0,52.983 0,305.029 83.709,305.029 83.709,269.228 35.801,269.228"/>
                    <rect x="167.072" y="90.968" width="23.867" height="54.466"/>
                    <polygon points="304.31,193.515 304.31,169.647 274.303,169.647 217.564,169.647 217.564,193.515 274.303,193.515"/>
                    <rect x="167.072" y="211.749" width="23.867" height="54.466"/>
                    <polygon points="53.702,169.647 53.702,193.515 83.709,193.515 140.448,193.515 140.448,169.647 83.709,169.647"/>
                </g></g>
            </svg>
        )
    },
    {
        id: 'svg4',
        content: ({ className, style }) => (
            <svg height="41px" width="41px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 477.554 477.554" className={className} style={style}>
                <g><g>
                    <path d="M267.227,12.193c0-6.73-21.72-12.193-28.45-12.193s-28.45,5.462-28.45,12.193l16.257,180.861 c0,6.73,5.462,12.193,12.193,12.193s12.193-5.462,12.193-12.193L267.227,12.193z"/>
                    <path d="M272.307,238.777c0,6.73,5.462,12.193,12.193,12.193l180.861,8.129 c6.73,0,12.193-13.591,12.193-20.321s-5.462-20.321-12.193-20.321L284.5,226.584C277.77,226.584,272.307,232.046,272.307,238.777z"/>
                    <path d="M238.777,477.554c6.73,0,28.45-5.462,28.45-12.193L250.97,284.5c0-6.73-5.462-12.193-12.193-12.193 s-12.193,5.462-12.193,12.193l-16.257,180.861C210.327,472.091,232.046,477.554,238.777,477.554z"/>
                    <path d="M0,238.777c0,6.73,5.462,20.321,12.193,20.321l180.861-8.129c6.73,0,12.193-5.462,12.193-12.193 s-5.462-12.193-12.193-12.193l-180.861-8.129C5.462,218.455,0,232.046,0,238.777z"/>
                    <circle cx="238.777" cy="236.745" r="9.657"/>
                </g></g>
            </svg>
        )
    },
    {
        id: 'svg5',
        content: ({ className, style }) => (
            <svg height="40px" width="40px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" className={className} style={style}>
                <g fill="currentColor"><circle cx="24" cy="24" r="20"/></g>
            </svg>
        )
    },
    {
        id: 'svg6',
        content: ({ className, style }) => (
            <svg height="40px" width="40px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className} style={style}>
                <g fill="currentColor">
                    <path d="M50 1 A49 49 0 0 1 99 50 L86 50 A36 36 0 0 0 50 14 Z M99 50 A49 49 0 0 1 50 99 L50 86 A36 36 0 0 0 86 50 Z M50 99 A49 49 0 0 1 1 50 L14 50 A36 36 0 0 0 50 86 Z M1 50 A49 49 0 0 1 50 1 L50 14 A36 36 0 0 0 14 50 Z"/>
                    <path d="M32 32 H68 V68 H32 Z"/>
                    <path d="M47 14 H53 V36 H47 Z M47 64 H53 V86 H47 Z M14 47 H36 V53 H14 Z M64 47 H86 V53 H64 Z"/>
                    <circle cx="50" cy="50" r="4"/>
                </g>
            </svg>
        )
    },
    {
        id: 'svg7',
        content: ({ className, style }) => (
            <svg height="40px" width="40px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className} style={style}>
                <g fill="none" stroke="currentColor">
                    <circle cx="50" cy="50" r="4.5" fill="currentColor" stroke="none"/>
                    <circle cx="50" cy="50" r="20" strokeWidth="3.5"/>
                    <circle cx="50" cy="50" r="42" strokeWidth="3.5"/>
                    <g strokeWidth="7" strokeLinecap="butt">
                        <path d="M50 0 V11 M50 89 V100 M0 50 H11 M89 50 H100"/>
                        <path d="M14.5 14.5 L22 22 M78 78 L85.5 85.5 M14.5 85.5 L22 78 M78 14.5 L85.5 22"/>
                    </g>
                </g>
            </svg>
        )
    },
    {
        id: 'svg8',
        content: ({ className, style }) => (
            <svg height="40px" width="40px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className} style={style}>
                <g fill="none" stroke="currentColor" strokeLinecap="butt" strokeLinejoin="miter">
                    <path d="M30 15 H15 V30 M70 15 H85 V30 M30 85 H15 V70 M70 85 H85 V70" strokeWidth="8"/>
                    <path d="M50 28 V72 M28 50 H72" strokeWidth="6"/>
                    <rect x="44" y="44" width="12" height="12" fill="currentColor" stroke="none" transform="rotate(45 50 50)"/>
                </g>
            </svg>
        )
    },
    {
        id: 'svg9',
        content: ({ className, style }) => (
            <svg height="40px" width="40px" version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" className={className} style={style}>
                <g fill="currentColor" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M50 6 L94 50 L50 94 L6 50 Z" fill="currentColor" stroke="none"/>
                    <rect x="34" y="34" width="32" height="32" rx="4" ry="4" fill="none" strokeWidth="4"/>
                    <circle cx="50" cy="50" r="9" fill="none" strokeWidth="2.5"/>
                    <path d="M44 50 H56 M50 44 V56" strokeWidth="2.5"/>
                </g>
            </svg>
        )
    }
];

export const renderCustomCrosshair = (grid: boolean[][], props: CrosshairProps) => {
    const size = grid.length;
    const pixelSize = 10;
    const totalSize = size * pixelSize;
    return (
        <svg viewBox={`0 0 ${totalSize} ${totalSize}`} {...props}>
            {grid.map((row, r) =>
                row.map((cell, c) =>
                    cell ? <rect key={`${r}-${c}`} x={c * pixelSize} y={r * pixelSize} width={pixelSize} height={pixelSize} fill="currentColor"/> : null
                )
            )}
        </svg>
    );
};