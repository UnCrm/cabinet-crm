import React, { useState } from 'react';
import { Monitor, Share2, Download } from 'lucide-react';
import { User, CabinetInfo } from '../types/crm';
import { InstallAppModal } from './InstallAppModal';
import { usePWAInstall } from '../hooks/usePWAInstall';

export interface PWAInstallButtonProps {
  className?: string;
  currentUser?: User;
  users?: User[];
  cabinetInfo?: CabinetInfo;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  currentUser,
  users = [],
  cabinetInfo
}) => {
  const { isInstallable, isInstalled } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  // Strict requirement: HIDE install button for all accounts EXCEPT Admin
  if (currentUser?.role !== 'ADMIN') {
    return null;
  }

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-md shadow-blue-900/30 transition cursor-pointer border border-blue-400/30 ${className}`}
        title="Installer l'application sur votre PC ou envoyer le lien d'installation à vos collaborateurs"
      >
        <Monitor className="w-3.5 h-3.5 text-blue-200" />
        <span className="hidden sm:inline">
          {isInstalled ? "Déployer l'App PC" : "Installer / Déployer l'App"}
        </span>
        <span className="sm:hidden">Installer</span>
      </button>

      {showModal && (
        <InstallAppModal
          isOpen={showModal}
          onClose={() => setShowModal(false)}
          currentUser={currentUser}
          users={users}
          cabinetInfo={cabinetInfo}
          initialTab={isInstalled ? 'SHARE' : 'SHARE'}
        />
      )}
    </>
  );
};
