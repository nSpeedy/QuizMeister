import { useEffect, useState } from 'react';

export default function Countdown({ deadline, durationMs }: { deadline: number; durationMs: number }) {
    const [now, setNow] = useState(() => Date.now());

    useEffect(() => {
        const id = setInterval(() => setNow(Date.now()), 200);
        return () => clearInterval(id);
    }, []);

    const remaining = Math.max(0, deadline - now);
    const seconds = Math.ceil(remaining / 1000);

    return (
        <div className="countdown">
            <span className={`countdown-value${seconds <= 5 ? ' text-danger' : ''}`}>{seconds}</span>
            <div className="progress countdown-bar" role="progressbar" aria-label="Time left"
                 aria-valuenow={seconds} aria-valuemin={0} aria-valuemax={durationMs / 1000}>
                <div className="progress-bar" style={{ width: `${(remaining / durationMs) * 100}%` }}/>
            </div>
        </div>
    );
}
