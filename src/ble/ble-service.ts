import { BleManager, Device } from 'react-native-ble-plx';
import base64 from 'react-native-base64';
import { DCXException } from '../utils';
import { PresentationFrame } from '@sd-jwt/types';
import { RequestObject } from '@vdcs/oid4vp-client';
import { SDJwtInstance } from '@sd-jwt/core';
import { normalizePrivateKey, P256 } from '@vdcs/jwt';
import { sha256 } from '@sd-jwt/hash';
import { uint8ArrayToBase64Url } from '@sd-jwt/utils';
import { WalletSDK } from '../core';
import { hash } from '../hash';
import { BleCallback, BleConfig, ConnectionStatusCallback } from '../types/ble';
import { Platform } from 'react-native';

class BLEService {
  private readonly DEVICE_NAME = 'HDCXWallet';
  private readonly CHUNK_SIZE = 300;

  private bleManager: BleManager;
  private chunkStore: { [key: string]: string[] } = {};
  private connectedDevice: Device | null = null;
  private connectionStatusCallback: ConnectionStatusCallback | null = null;
  private scanTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private config: BleConfig | null = null;
  private walletSDK: WalletSDK;

  constructor(walletSDK: WalletSDK) {
    this.bleManager = new BleManager();
    this.walletSDK = walletSDK;
  }

  public async checkPermissions(): Promise<boolean> {
    if (Platform.OS === 'ios') {
      const status = await this.bleManager.state();
      return status === 'PoweredOn';
    }
    return true;
  }

  public async scanAndConnect(
    config: BleConfig,
    timeout: number = 10000,
  ): Promise<void> {
    this.config = config;
    try {
      const status = await this.bleManager.state();
      if (status !== 'PoweredOn') {
        throw new Error('Bluetooth is not powered on');
      }

      if (this.connectionStatusCallback) {
        this.connectionStatusCallback('scanning');
      }

      this.bleManager.startDeviceScan(null, null, async (error, device) => {
        if (error) {
          this.stopScanning();
          throw new DCXException('Failed to scan for device', { cause: error });
        }

        if (device?.localName === this.DEVICE_NAME && device.isConnectable) {
          this.stopScanning();

          try {
            const connectedDevice = await device.connect();
            const discoveredDevice =
              await connectedDevice.discoverAllServicesAndCharacteristics();
            this.connectedDevice = discoveredDevice;

            if (this.connectionStatusCallback) {
              this.connectionStatusCallback('connected', discoveredDevice);
            }
          } catch (error) {
            if (this.connectionStatusCallback) {
              this.connectionStatusCallback('disconnected');
            }

            throw new DCXException('Connection error', { cause: error });
          }
        }
      });

      this.scanTimeoutId = setTimeout(() => {
        this.stopScanning();
      }, timeout);
    } catch (error) {
      const typedError =
        error instanceof Error ? error : new Error(String(error));
      throw typedError;
    }
  }

  private stopScanning(): void {
    this.bleManager.stopDeviceScan();
    if (this.scanTimeoutId) {
      clearTimeout(this.scanTimeoutId);
      this.scanTimeoutId = null;
    }
  }

  public setConnectionStatusCallback(callback: ConnectionStatusCallback): void {
    this.connectionStatusCallback = callback;
  }

  public isConnected(): boolean {
    return this.connectedDevice !== null;
  }

  public monitorCharacteristic(callback: BleCallback) {
    try {
      if (!this.connectedDevice) {
        throw new Error('No device connected');
      }

      if (!this.config) {
        throw new Error('BLE configuration not set');
      }

      const subscription = this.connectedDevice.monitorCharacteristicForService(
        this.config.serviceUUID,
        this.config.characteristicUUID,
        (error, characteristic) => {
          if (error) {
            callback(error, null);
            return;
          }

          if (!characteristic?.value) {
            callback(null, null);
            return;
          }

          try {
            const cleanValue = characteristic.value.replace(/\s/g, '');
            const decodedValue = base64.decode(cleanValue);

            // Parse chunk information
            const [indexStr, totalStr, chunkData] = decodedValue.split(':');
            const chunkIndex = parseInt(indexStr, 10);
            const totalChunks = parseInt(totalStr, 10);
            const messageKey = `message_${totalChunks}`;

            // Initialize chunk array if not exists
            if (!this.chunkStore[messageKey]) {
              this.chunkStore[messageKey] = new Array(totalChunks).fill('');
            }
            this.chunkStore[messageKey][chunkIndex] = chunkData;

            // Check if all chunks are received
            if (this.chunkStore[messageKey]?.every((chunk) => chunk !== '')) {
              const completeData = this.chunkStore[messageKey].join('');
              const decoded = base64.decode(completeData);
              callback(null, decoded);
              delete this.chunkStore[messageKey];
            }
          } catch (error) {
            callback(error as Error, null);
            throw new DCXException('Error processing data', {
              cause: error,
            });
          }
        },
      );

      return subscription;
    } catch (error) {
      throw new DCXException('Failed to setup characteristic monitoring', {
        cause: error,
      });
    }
  }

  public async sendData(data: string): Promise<void> {
    if (!this.connectedDevice) {
      throw new DCXException('No device connected');
    }

    if (!this.config) {
      throw new DCXException('BLE configuration not set');
    }

    try {
      const chunks = this.prepareDataChunks(data);
      await this.sendChunks(chunks);
    } catch (error) {
      throw new DCXException('Failed to send data', { cause: error });
    }
  }

  public async present<T extends Record<string, unknown>>(
    device: Device,
    credential: string,
    presentationFrame: PresentationFrame<T>,
    requestObject: RequestObject,
  ): Promise<void> {
    if (!device) {
      throw new DCXException('No device connected');
    }

    try {
      const { client_id, nonce } = requestObject;
      const sdJwtInstance = new SDJwtInstance({
        hasher: hash,
        kbSignAlg: 'ES256',
        kbSigner: (data: string) => {
          const privateKey = normalizePrivateKey(this.walletSDK.jwk);
          const signingInputBytes = sha256(data);
          const signature = P256.sign(signingInputBytes, privateKey);
          const base64UrlSignature = uint8ArrayToBase64Url(signature);
          return base64UrlSignature;
        },
      });

      const kbPayload = {
        iat: Math.floor(Date.now() / 1000),
        aud: client_id,
        nonce,
      };

      const presentation = await sdJwtInstance.present(
        credential,
        presentationFrame,
        { kb: { payload: kbPayload } },
      );

      this.sendData(
        JSON.stringify({
          type: 'vp_token',
          value: { 0: presentation },
        }),
      );
    } catch (error) {
      throw new DCXException('Failed to present credential', { cause: error });
    }
  }

  private prepareDataChunks(data: string): string[] {
    const isBase64 = /^[A-Za-z0-9+/]*={0,2}$/.test(data);
    const encodedData = isBase64 ? data : base64.encode(data);
    return encodedData.match(new RegExp(`.{1,${this.CHUNK_SIZE}}`, 'g')) || [];
  }

  private async sendChunks(chunks: string[]): Promise<void> {
    if (!this.config || !this.connectedDevice) {
      throw new Error('BLE configuration or device not set');
    }

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isLastChunk = i === chunks.length - 1;
      const chunkWithMetadata = `${i}:${chunks.length}:${chunk}`;
      const encodedChunk = base64.encode(chunkWithMetadata);

      try {
        await this.connectedDevice.writeCharacteristicWithoutResponseForService(
          this.config.serviceUUID,
          this.config.characteristicUUID,
          encodedChunk,
        );

        if (!isLastChunk) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (writeError) {
        throw new DCXException('Failed to send chunk', { cause: writeError });
      }
    }
  }

  public destroy(): void {
    this.stopScanning();

    if (this.connectedDevice) {
      this.connectedDevice.cancelConnection();
      this.connectedDevice = null;
    }

    if (this.connectionStatusCallback) {
      this.connectionStatusCallback('disconnected');
      this.connectionStatusCallback = null;
    }

    this.config = null;
    this.chunkStore = {};
    this.bleManager.destroy();
  }
}

export { BLEService };
