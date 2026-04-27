import React, { useState } from 'react';
import { Lock, ShieldAlert } from 'lucide-react';

interface LoginViewProps {
  target: 'pos' | 'admin';
  onSuccess: () => void;
  onCancel: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ target, onSuccess, onCancel }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const correctPassword = target === 'pos' ? '000' : 'Palette@25';
    
    if (password === correctPassword) {
      onSuccess();
    } else {
      setError(true);
      setPassword('');
      setTimeout(() => setError(false), 2000);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-20 p-8 bg-white rounded-2xl shadow-xl border border-[#4A3728]/10">
      <div className="flex flex-col items-center mb-8">
        <div className="bg-[#4A3728] p-4 rounded-full mb-4">
          <Lock className="text-white" size={32} />
        </div>
        <h2 className="text-2xl font-bold">Secure Access</h2>
        <p className="text-[#4A3728]/60 mt-2 text-center">
          Please enter the password for {target === 'pos' ? 'POS System' : 'Admin Area'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter password..."
            autoFocus
            className={`w-full p-4 rounded-xl border ${error ? 'border-red-500 bg-red-50' : 'border-[#4A3728]/20'} focus:outline-none focus:ring-2 focus:ring-[#D97706] transition-all text-center text-xl tracking-widest`}
          />
          {error && (
            <div className="flex items-center gap-2 text-red-500 mt-2 text-sm justify-center">
              <ShieldAlert size={16} />
              <span>Incorrect password. Try again.</span>
            </div>
          )}
        </div>

        <button
          type="submit"
          className="w-full bg-[#4A3728] text-white py-4 rounded-xl font-bold hover:bg-[#32251B] transition-colors shadow-md"
        >
          Login
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="w-full text-[#4A3728]/60 py-2 hover:text-[#4A3728] transition-colors"
        >
          Cancel
        </button>
      </form>
    </div>
  );
};
