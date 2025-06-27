import { Device } from 'react-native-ble-plx';

export type BleCallback = (error: Error | null, data: string | null) => void;
export type ConnectionStatusCallback = (
  status: 'scanning' | 'connected' | 'disconnected',
  device?: Device,
) => void;

export interface BleConfig {
  serviceUUID: string;
  characteristicUUID: string;
}
