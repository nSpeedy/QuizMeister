import { Link, useSearchParams } from "react-router";
import LoginForm from "@/components/loginForm";
export default function Login(){
    const [searchParams] = useSearchParams();
    return (
        <div className="mx-auto" style={{ maxWidth: 420 }}>
            <h1>Account Login</h1>
            <LoginForm/>
            <p className="mt-3">
                Don't have an account? <Link to={`/register?${searchParams}`}>Register</Link>
            </p>
        </div>
    );
}
