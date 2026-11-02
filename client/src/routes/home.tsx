import { Link } from 'react-router';

function Home() {
return (
    <>
        <div className="container py-5 text-center">
            <h1 className="display-3 fw-bold">QuizMeister</h1>
            <h2 className="display-6 text-body-secondary mb-5">Best tool for making and playing quizzes!</h2>
            <div className="d-flex flex-column flex-sm-row justify-content-center gap-3">
                <Link to="/lobby" className="btn btn-primary btn-lg px-5">Join a game</Link>
                <Link to="/admin" className="btn btn-outline-secondary btn-lg px-5">Create & host quizzes</Link>
            </div>
        </div>
    </>
)
}
export  default Home;
