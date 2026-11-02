import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { login } from '@/lib/api/auth';
import { ApiError } from '@/lib/api';
import { safeNext } from '@/lib/safeNext';

function LoginForm(){
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>){
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const username = String(formData.get("username") ?? "");
        const password = String(formData.get("password") ?? "");

        setPending(true);
        setError(null);
        try {
            await login(username, password);
            navigate(safeNext(searchParams.get("next")), { replace: true });
        } catch (err) {
            setError(err instanceof ApiError && err.status === 401
                ? "Invalid username or password"
                : "Something went wrong, try again");
        } finally {
            setPending(false);
        }
    }
    return (<>
            <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                <div className="mb-3">
                    <label htmlFor="InputLogin" className="form-label">Login</label>
                    <input type="text" name="username" className="form-control" id="InputLogin"
                           autoComplete="username" required/>
                </div>
                <div className="mb-3">
                    <label htmlFor="InputPassword" className="form-label">Password</label>
                    <input type="password" name="password" className="form-control" id="InputPassword"
                           autoComplete="current-password" required/>
                </div>
                <button type="submit" className="btn btn-primary" disabled={pending}>
                    {pending ? "Logging in..." : "Login"}
                </button>
            </form>
        </>
    )
}

export default LoginForm;
