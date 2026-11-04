import type { QuestionIntroData } from '@/models/Game';

export default function QuestionIntro({ questionIndex, total, introMs, text }: QuestionIntroData) {
    return (
        <div className="question-intro text-center py-5">
            <div className="intro-label mb-3">Question {questionIndex + 1} of {total}</div>
            <p className={text ? 'question-text intro-text mb-5' : 'intro-ready mb-5'}>{text ?? 'Get ready!'}</p>
            {introMs > 0 && (
                <div className="intro-bar mx-auto">
                    <div className="intro-bar-fill" style={{ animationDuration: `${introMs}ms` }}/>
                </div>
            )}
        </div>
    );
}
