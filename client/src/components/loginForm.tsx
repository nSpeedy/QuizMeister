function LoginForm(){
    return (<>
            <form>
                <div className="mb-3">
                    <label htmlFor="InputLogin" className="form-label">Login</label>
                    <input type="text" className="form-control" id="InputLogin"/>
                </div>
                <div className="mb-3">
                    <label htmlFor="InputPassword" className="form-label">Password</label>
                    <input type="password" className="form-control" id="InputPassword"/>
                </div>
                <button type="submit" className="btn btn-primary">Login</button>
            </form>
        </>
    )
}

export default LoginForm;