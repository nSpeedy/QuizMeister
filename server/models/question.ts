export interface Question {
    id: number;
    quizId: number;
    position: number;
    text: string;
    options: string[];
    correctIndex: number;
    timeLimitS: number;
}
