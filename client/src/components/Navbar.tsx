import { useState } from 'react';
import { Link, NavLink } from 'react-router';

const links = [
    { to: '/', label: 'Home' },
    { to: '/lobby', label: 'Lobby' },
];

function Navbar() {
    const [open, setOpen] = useState(false);

    return (
        <nav className="navbar navbar-expand-sm bg-dark" data-bs-theme="dark">
            <div className="container-fluid">
                <Link className="navbar-brand fw-bold" to="/">QuizMeister</Link>
                <button className="navbar-toggler" type="button" aria-controls="mainNavbar"
                        aria-expanded={open} aria-label="Toggle navigation"
                        onClick={() => setOpen((o) => !o)}>
                    <span className="navbar-toggler-icon"></span>
                </button>
                <div className={`collapse navbar-collapse${open ? ' show' : ''}`} id="mainNavbar">
                    <div className="navbar-nav ms-auto">
                        {links.map(({ to, label }) => (
                            <NavLink key={to} className="nav-link" to={to} end
                                     onClick={() => setOpen(false)}>
                                {label}
                            </NavLink>
                        ))}
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
