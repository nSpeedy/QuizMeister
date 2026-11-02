import apiRequest from '@/lib/api';
import type { Question, QuestionInput, Quiz, QuizInput, QuizWithQuestions } from '@/models/QuizForm';

const BASE = '/api/v1/quizzes';

export function listQuizzes() {
    return apiRequest<Quiz[]>(BASE);
}

export function getQuiz(id: number) {
    return apiRequest<QuizWithQuestions>(`${BASE}/${id}`);
}

export function createQuiz(input: QuizInput) {
    return apiRequest<Quiz>(BASE, { method: 'POST', body: JSON.stringify(input) });
}

export function updateQuiz(id: number, input: QuizInput) {
    return apiRequest<Quiz>(`${BASE}/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteQuiz(id: number) {
    return apiRequest<void>(`${BASE}/${id}`, { method: 'DELETE' });
}

export function createQuestion(quizId: number, input: QuestionInput) {
    return apiRequest<Question>(`${BASE}/${quizId}/questions`, { method: 'POST', body: JSON.stringify(input) });
}

export function updateQuestion(quizId: number, id: number, input: QuestionInput) {
    return apiRequest<Question>(`${BASE}/${quizId}/questions/${id}`, { method: 'PUT', body: JSON.stringify(input) });
}

export function deleteQuestion(quizId: number, id: number) {
    return apiRequest<void>(`${BASE}/${quizId}/questions/${id}`, { method: 'DELETE' });
}
