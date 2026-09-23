# Cabinet CRM Assurance — Auto, Habitation, VTC (Antigravity Edition)

CRM complet et moderne pour cabinet de courtage en assurances (Auto, Habitation, VTC).
Ce projet est prêt pour le développement et déploiement dans l'environnement **Google Antigravity (AGY)**.

---

## 🚀 Démarrage Rapide

### Prérequis
- **Node.js** (v18+ ou v20+ recommandé)
- **npm**, **bun**, ou **pnpm**

### Installation & Lancement

1. **Installer les dépendances** :
   ```bash
   npm install
   ```

2. **Configurer les variables d'environnement** :
   - Dupliquez `.env.example` en `.env.local`
   - Ajoutez votre clé `GEMINI_API_KEY` si vous utilisez les fonctionnalités IA :
     ```env
     GEMINI_API_KEY=votre_cle_api_gemini
     PORT=3000
     NODE_ENV=development
     ```

3. **Lancer le serveur de développement** :
   ```bash
   npm run dev
   ```
   L'application sera accessible sur `http://localhost:3000`.

4. **Compiler pour la production** :
   ```bash
   npm run build
   npm start
   ```

---

## 🏗️ Architecture & Fonctionnalités Clés

- **⚡ Frontend** : React 19, TypeScript, Tailwind CSS v4, Motion, Lucide Icons, Vite PWA.
- **🔥 Synchronisation Cloud Firebase Firestore** :
  - Synchronisation temps réel (`onSnapshot`) des dossiers leads, utilisateurs, canaux de chat, sessions conseillers et configurations cabinet.
  - **Résilience & Mode Hors-Ligne** : bascule automatique transparente sur le stockage local (`localStorage`) en cas d'interruption réseau ou de dépassement de quota.
- **🔐 Authentification & RBAC** :
  - Rôles : `DIRECTEUR_GENERAL` (Admin), `RESPONSABLE_EQUIPE`, `GESTIONNAIRE`, `COMMERCIAL`.
  - Connexion Google Auth et comptes internes personnalisés.
- **📄 Devis, DDA & Devoir de Conseil** :
  - Génération automatique des devis d'assurance (Auto, Habitation, VTC).
  - Modules interactifs de signature électronique DDA et rapport de conseil personnalisé.
- **💬 Messagerie & Suivi d'Activité** :
  - Messagerie instantanée d'équipe avec salons et canaux dédiés.
  - Horodatage des sessions de travail et pauses des conseillers.
- **📧 Module SMTP & Signature Pro** :
  - Envoi direct d'emails avec modèles personnalisables.
  - Intégration CID inline pour un affichage garanti des signatures et logos sur tous les clients mails (Gmail, Outlook, Apple Mail).

