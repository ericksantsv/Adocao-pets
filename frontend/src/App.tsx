import { Link, Route, Routes } from 'react-router-dom';
import { Navbar } from './components/Navbar';
import { ProtectedRoute } from './components/ProtectedRoute';
import { DogDetail } from './pages/DogDetail';
import { Home } from './pages/Home';
import { Login } from './pages/Login';
import { ManageDogs } from './pages/ManageDogs';
import { ManageMatches } from './pages/ManageMatches';
import { MyMatches } from './pages/MyMatches';
import { Profile } from './pages/Profile';
import { Register } from './pages/Register';

export default function App() {
  return (
    <>
      <Navbar />
      <main className="container">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/caes/:id" element={<DogDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/cadastro" element={<Register />} />
          <Route path="/perfil" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
          <Route path="/meus-pedidos" element={<ProtectedRoute roles={['ADOTANTE']}><MyMatches /></ProtectedRoute>} />
          <Route path="/gestao/caes" element={<ProtectedRoute roles={['INSTITUICAO']}><ManageDogs /></ProtectedRoute>} />
          <Route path="/gestao/matches" element={<ProtectedRoute roles={['INSTITUICAO']}><ManageMatches /></ProtectedRoute>} />
          <Route path="*" element={<p className="center">Página não encontrada. <Link to="/">Voltar</Link></p>} />
        </Routes>
      </main>
    </>
  );
}
