import { Link, useSearchParams } from "react-router";
import RegisterForm from "@/components/registerForm";
export default function Register(){
    const [searchParams] = useSearchParams();
    return (
        <div className="mx-auto" style={{ maxWidth: 420 }}>
            <h1>Create Account</h1>
            <RegisterForm/>
            <p className="mt-3">
                Already have an account? <Link to={`/login?${searchParams}`}>Log in</Link>
            </p>
        </div>
    );
}
