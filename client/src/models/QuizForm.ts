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
    Questions: Question[];
}