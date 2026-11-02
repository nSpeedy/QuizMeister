import type { ReactNode } from 'react';
import { ANSWER_STYLES } from '@/lib/game';

type Props = {
    index: number;
    children?: ReactNode;
    state?: 'correct' | 'wrong';
    onClick?: () => void;
    disabled?: boolean;
};

export default function AnswerTile({ index, children, state, onClick, disabled }: Props) {
    const style = ANSWER_STYLES[index];
    const className = `answer-tile answer-${style.color}${state ? ` answer-${state}` : ''}`;
    const content = (
        <>
            <span className="answer-symbol" aria-hidden="true">{style.symbol}</span>
            {children && <span className="answer-text">{children}</span>}
        </>
    );

    if (onClick) {
        return (
            <button type="button" className={className} onClick={onClick} disabled={disabled} aria-label={style.name}>
                {content}
            </button>
        );
    }
    return <div className={className}>{content}</div>;
}
