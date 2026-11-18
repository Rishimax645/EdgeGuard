import type { Metadata } from 'next';
import './globals.css';
export const metadata:Metadata={title:'EdgeGuard | Safety monitoring',description:'A focused workplace monitoring station. Sensors, camera, incidents and notifications in one place.'};
export default function Layout({children}:{children:React.ReactNode}){return <html lang="en"><body>{children}</body></html>}
