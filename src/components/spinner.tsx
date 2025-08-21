import * as RSpinner from 'react-spinners';

export type SpinnerProps = {
    size?: number;
    color?: string;
    type?: keyof typeof RSpinner;
}

export default function Spinner({ size = 14, color = "#90e790", type = "BeatLoader" }: SpinnerProps) {
    const SpinnerComponent = RSpinner[type];
    return (
        <div className="relative w-full">
            <div className="absolute inset-0 flex items-center justify-center">
                <SpinnerComponent size={size} color={color} />
            </div>
        </div>
    );
}
