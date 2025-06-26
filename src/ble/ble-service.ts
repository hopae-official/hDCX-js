import { Device } from 'react-native-ble-plx';
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

export type BleCallback = (error: Error | null, data: string | null) => void;

class BLEService {
  private readonly SERVICE_UUID = '4FAFC201-1FB5-459E-8FCC-C5C9C331914B';
  private readonly CHARACTERISTIC_UUID = 'BEB5483E-36E1-4688-B7F5-EA07361B26A8';
  private readonly CHUNK_SIZE = 300;
  private chunkStore: { [key: string]: string[] } = {};

  constructor(private readonly walletSDK: WalletSDK) {}

  public monitorCharacteristic(device: Device, callback: BleCallback) {
    try {
      const subscription = device.monitorCharacteristicForService(
        this.SERVICE_UUID,
        this.CHARACTERISTIC_UUID,
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
            throw new DCXException('Failed to process data', { cause: error });
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

  public async sendData(device: Device, data: string): Promise<void> {
    if (!device) {
      throw new DCXException('No device connected');
    }

    try {
      const chunks = this.prepareDataChunks(data);
      await this.sendChunks(device, chunks);
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
        device,
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

  private async sendChunks(device: Device, chunks: string[]): Promise<void> {
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const isLastChunk = i === chunks.length - 1;
      const chunkWithMetadata = `${i}:${chunks.length}:${chunk}`;
      const encodedChunk = base64.encode(chunkWithMetadata);

      try {
        await device.writeCharacteristicWithoutResponseForService(
          this.SERVICE_UUID,
          this.CHARACTERISTIC_UUID,
          encodedChunk,
        );

        if (!isLastChunk) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      } catch (writeError) {
        throw new DCXException(`Failed to send chunk ${i + 1}`, {
          cause: writeError,
        });
      }
    }
  }
}

export { BLEService };
