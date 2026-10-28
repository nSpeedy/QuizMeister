import LoginForm from "@/components/loginForm";
import { handleLogin } from "@/lib/api/auth";
export default function login(){
    return (
        <>
            <h1>Account Login</h1>
            <LoginForm/>
        </>
    );
}