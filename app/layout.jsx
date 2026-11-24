import './style.css';
export const metadata = {
  title: 'Seu Cartaz Agora | Estúdio de ofertas',
  description: 'Crie, personalize e imprima cartazes de ofertas.'
};
export default function RootLayout({ children }) {
  return <html lang="pt-BR"><body>{children}</body></html>;
}
