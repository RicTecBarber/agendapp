import { useState } from 'react';

export default function ChangePasswordModal({ onClose }) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch('/system/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          currentPassword: current, 
          newPassword: newPass 
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      onClose(); // Fecha o modal após sucesso
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h2>Alterar Senha</h2>
        {error && <p className="error">{error}</p>}
        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Senha atual"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Nova senha"
            value={newPass}
            onChange={(e) => setNewPass(e.target.value)}
            minLength={8}
            required
          />
          <button type="submit">Salvar</button>
          <button type="button" onClick={onClose}>Cancelar</button>
        </form>
      </div>
    </div>
  );
}