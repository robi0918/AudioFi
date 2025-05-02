import { createRoot } from 'react-dom/client'
import '@rainbow-me/rainbowkit/styles.css'
import './index.css'
import { SocialWallet } from './SocialWallet.tsx';
import neroConfig from '../nerowallet.config'
import App from '@/App.tsx';

createRoot(document.getElementById("root")!).render(
    <SocialWallet config={neroConfig} mode='sidebar'>
        <App />
    </SocialWallet>
);
