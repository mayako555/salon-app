declare module 'react-qr-scanner' {
  import { Component } from 'react';

  interface QrScannerProps {
    delay?: number | false;
    onScan: (data: { text: string } | null) => void;
    onError: (error: any) => void;
    style?: React.CSSProperties;
    constraints?: MediaStreamConstraints;
    facingMode?: 'user' | 'environment';
  }

  export default class QrScanner extends Component<QrScannerProps> {}
}
