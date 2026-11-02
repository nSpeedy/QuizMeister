import { useState, type FormEvent } from 'react';
import { useNavigate, useSearchParams } from 'react-router';
import { register } from '@/lib/api/auth';
import { errorMessage } from '@/lib/api';
import { safeNext } from '@/lib/safeNext';

function RegisterForm(){
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [error, setError] = useState<string | null>(null);
    const [pending, setPending] = useState(false);

    async function handleSubmit(e: FormEvent<HTMLFormElement>){
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const username = String(formData.get("username") ?? "");
        const password = String(formData.get("password") ?? "");
        if (password !== formData.get("confirm")) { setError("Passwords don't match"); return; }

        setPending(true);
        setError(null);
        try {
            await register(username, password);
            navigate(safeNext(searchParams.get("next"), "/admin"), { replace: true });
        } catch (err) {
            setError(errorMessage(err));
        } finally {
            setPending(false);
        }
    }
    return (<>
            <form onSubmit={handleSubmit}>
                {error && <div className="alert alert-danger" role="alert">{error}</div>}
                <div className="mb-3">
                    <label htmlFor="InputRegisterLogin" className="form-label">Login</label>
                    <input type="text" name="username" className="form-control" id="InputRegisterLogin"
                           autoComplete="username" minLength={3} maxLength={32} required/>
                </div>
                <div className="mb-3">
                    <label htmlFor="InputRegisterPassword" className="form-label">Password</label>
                    <input type="password" name="password" className="form-control" id="InputRegisterPassword"
                           autoComplete="new-password" minLength={8} maxLength={128} required/>
                </div>
                <div className="mb-3">
                    <label htmlFor="InputRegisterConfirm" className="form-label">Repeat password</label>
                    <input type="password" name="confirm" className="form-control" id="InputRegisterConfirm"
                           autoComplete="new-password" required/>
                </div>
                <button type="submit" className="btn btn-primary" disabled={pending}>
                    {pending ? "Creating account..." : "Register"}
                </button>
            </form>
        </>
    )
}

export default RegisterForm;
