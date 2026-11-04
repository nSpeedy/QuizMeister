import { NavLink, Outlet, useNavigate } from 'react-router';
import type { Route } from './+types/admin';
import { logout, requireUser } from '@/lib/api/auth';

export async function clientLoader({ request }: Route.ClientLoaderArgs) {
    return { user: await requireUser(request) };
}

function Admin({ loaderData }: Route.ComponentProps) {
    const navigate = useNavigate();

    async function handleLogout() {
        await logout();
        navigate('/login', { replace: true });
    }

    return (
        <div className="container py-2" style={{ maxWidth: 900 }}>
            <div className="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
                <h1 className="h3 mb-0">QuizMeister Admin</h1>
                <div className="d-flex gap-3 me-auto ms-md-3">
                    <NavLink to="/admin" end className="text-decoration-none">Quizzes</NavLink>
                    <NavLink to="/admin/history" className="text-decoration-none">History</NavLink>
                </div>
                <div className="d-flex align-items-center gap-3">
                    <span className="text-body-secondary">Logged in as <strong>{loaderData.user.username}</strong></span>
                    <button className="btn btn-outline-secondary btn-sm" onClick={handleLogout}>Logout</button>
                </div>
            </div>
            <Outlet/>
        </div>
    )
}
export default Admin;
