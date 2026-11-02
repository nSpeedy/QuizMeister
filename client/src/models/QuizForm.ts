export interface Question {
    id: number;
    quizId: number;
    position: number;
    text: string;
    options: string[];
    correctIndex: number;
    timeLimitS: number;
}
export interface Quiz {
    id: number;
    owner_id: number;
    title: string;
    is_public: boolean;
}
export interface QuizWithQuestions extends Quiz {
    questions: Question[];
}
export type QuizInput = Pick<Quiz, 'title' | 'is_public'>;
export type QuestionInput = Pick<Question, 'text' | 'options' | 'correctIndex' | 'timeLimitS'>;
