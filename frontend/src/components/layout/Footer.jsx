import React from 'react';

export default function Footer() {
  return (
    <footer className="mt-16 bg-slate-900 text-slate-300 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col md:flex-row justify-between gap-8 text-sm">
        <div className="mb-6 md:mb-0 max-w-sm">
          <div className="flex items-center gap-2 mb-3">
            <img src="/logo.png" alt="G3 Transport" className="w-8 h-8 object-contain" />
            <h3 className="text-white font-bold text-xl">G3 Transport</h3>
          </div>
          <p className="text-xs text-slate-400 mb-1">Commercial Freight, Lorry Transport & Logistics Services</p>
          <p className="mb-1 text-slate-400">Lorry Market Street,</p>
          <p className="mb-4 text-slate-400">Shevapet, Salem - 636002</p>
          <p className="text-slate-500 text-xs mt-4">&copy; {new Date().getFullYear()} G3 Transport. All rights reserved.</p>
        </div>
        <div className="text-left md:text-right">
          <h3 className="text-white font-bold text-lg mb-3">Contact & Dispatch</h3>
          <p className="mb-1 text-green-400 font-mono text-base tracking-wider font-semibold">9488289991 &bull; 9080942982</p>
          <p className="mb-1 text-slate-300">g3transport.dispatch@gmail.com</p>
          <p className="text-slate-400 text-xs">Operating Salem &bull; Chennai &bull;</p>
        </div>
      </div>
    </footer>
  );
}
