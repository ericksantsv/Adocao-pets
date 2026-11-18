import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export function Navbar() {
  const { user, role, logout } = useAuth();
  const { notify } = useToast();
  const navigate = useNavigate();

  const sair = () => {
    logout();
    notify('info', 'Você saiu da conta.');
    navigate('/');
  };

  return (
    <header className="navbar">
      <NavLink to="/" className="brand">🐶 Match de Adoção</NavLink>
      <nav>
        <NavLink to="/">Cachorros</NavLink>
        {role === 'ADOTANTE' && <NavLink to="/meus-pedidos">Meus pedidos</NavLink>}
        {role === 'INSTITUICAO' && (
          <>
            <NavLink to="/gestao/caes">Meus cães</NavLink>
            <NavLink to="/gestao/matches">Solicitações</NavLink>
          </>
        )}
        {user ? (
          <>
            <NavLink to="/perfil">👤 {user.nome.split(' ')[0]}</NavLink>
            <button className="link" onClick={sair}>Sair</button>
          </>
        ) : (
          <>
            <NavLink to="/login">Entrar</NavLink>
            <NavLink to="/cadastro" className="btn small">Cadastrar</NavLink>
          </>
        )}
      </nav>
    </header>
  );
}
